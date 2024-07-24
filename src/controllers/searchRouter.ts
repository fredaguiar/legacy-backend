import express, { NextFunction, Request, Response } from 'express';
import S3 from 'aws-sdk/clients/s3';
import { Types } from 'mongoose';
import striptags from 'striptags';
import User from '../models/User';

const searchRouter = (_storage: S3) => {
  const router = express.Router();

  const findSearchMatch = (values: (string | undefined)[], searchValue: string) => {
    for (let i = 0; i < values.length; i++) {
      const value: string = (values[i] as string) || '';
      if (value.indexOf(searchValue) !== -1) {
        return striptags(value); // TODO: remove html string code such as &nbsp;
      }
    }
    return '';
  };

  const newSearchSafesResult = (item: any, searchValue: string) => {
    const safe: TSafe = {
      _id: item.safes._id.toString(),
      name: item.safes.name,
      description: item.safes.description,
      files: [],
    };
    safe.searchMatch = findSearchMatch([safe.description], searchValue);
    safe.searchValue = searchValue;

    return safe;
  };

  router.get(
    '/search/:safeId?/:searchValue',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // @ts-ignore
        const userId = req.context.userId;
        const { searchValue, safeId } = req.params;

        if (!searchValue) {
          return res.status(404).send('Missing input information');
        }

        // TODO: there might be a better way to do this, with indexes.
        const searchFilesResult = await User.aggregate([
          { $match: { _id: new Types.ObjectId(userId as string) } },
          { $unwind: '$safes' },
          { $unwind: '$safes.files' },
          {
            $match: {
              $or: [
                { 'safes.files.fileName': { $regex: searchValue, $options: 'i' } },
                { 'safes.files.username': { $regex: searchValue, $options: 'i' } },
                { 'safes.files.notes': { $regex: searchValue, $options: 'i' } },
                { 'safes.files.content': { $regex: searchValue, $options: 'i' } }, // TODO: it will be slow eventually
              ],
            },
          },
          {
            $project: {
              _id: 0,
              'safes._id': 1,
              'safes.name': 1,
              'safes.description': 1,
              'safes.files._id': 1,
              'safes.files.fileName': 1,
              'safes.files.username': 1,
              'safes.files.notes': 1,
              'safes.files.content': 1,
              'safes.files.mimetype': 1,
              'safes.files.createdAt': 1,
            },
          }, //_id: 0, Exclude the user._id field
        ]);

        // TODO: good to have. merge this search with the previous one
        const searchSafesResult = await User.aggregate([
          { $match: { _id: new Types.ObjectId(userId as string) } },
          { $unwind: '$safes' },
          !safeId
            ? {
                $match: {
                  $or: [
                    { 'safes.name': { $regex: searchValue, $options: 'i' } },
                    { 'safes.description': { $regex: searchValue, $options: 'i' } },
                  ],
                },
              }
            : {
                $match: { 'safes._id': new Types.ObjectId(safeId as string) },
              },
          { $project: { _id: 0, 'safes._id': 1, 'safes.name': 1, 'safes.description': 1 } }, //_id: 0, Exclude the user._id field
        ]);

        // console.log(' Search searchSafesResult:', JSON.stringify(searchSafesResult));

        type TSafeMap = { [k: string]: TSafe };
        const resultMerged: TSafeMap = {};

        searchSafesResult.forEach((item) => {
          const safeId: keyof TSafeMap = item.safes._id.toString();
          resultMerged[safeId] = newSearchSafesResult(item, searchValue);
        });

        searchFilesResult.forEach((item) => {
          const safeId: keyof TSafeMap = item.safes._id.toString();
          if (!resultMerged[safeId]) {
            resultMerged[safeId] = newSearchSafesResult(item, searchValue);
          }
          const { fileName, mimetype, username, notes, content, createdAt } = item.safes.files;
          const file: TFile = {
            fileName,
            mimetype,
            username,
            uploadDate: createdAt,
          };
          file.searchMatch = findSearchMatch([username, notes, content], searchValue);
          file.searchValue = searchValue;
          resultMerged[safeId]?.files?.push(file);
        });

        const safeList: TSafe[] = Object.keys(resultMerged).map((key) => {
          return resultMerged[key] as TSafe;
        });

        // console.log(' Search safeList:', JSON.stringify(safeList));

        return res.json(safeList);
      } catch (error) {
        console.log('error Search results:', error);
        next(error);
      }
    },
  );

  return router;
};

export default searchRouter;
