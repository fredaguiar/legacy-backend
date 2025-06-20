import express, { NextFunction, Request, Response } from 'express';
import { Document } from 'mongoose';
import S3 from 'aws-sdk/clients/s3';
import User from '../models/User';
import { Safe } from '../models/Safe';
import { Contact } from '../models/Contact';
import { findSafeById } from '../utils/QueryUtil';

const safeRouter = (storage: S3) => {
  const router = express.Router();

  const deleteDirectory = async ({ userId, safeId }: { userId: string; safeId: string }) => {
    try {
      // listObjectsV2 returns up to 1000
      const listedObjects = await storage
        .listObjectsV2({
          Bucket: process.env.STORAGE_BUCKET as string,
          Prefix: `${userId}/${safeId}/`,
        })
        .promise();
      if (!listedObjects || !listedObjects.Contents || listedObjects.Contents.length === 0) {
        return;
      }
      const deleteParams = {
        Bucket: process.env.STORAGE_BUCKET as string,
        Delete: { Objects: [] as S3.ObjectIdentifier[] },
      };
      listedObjects.Contents.forEach(({ Key }) => {
        if (Key) {
          deleteParams.Delete.Objects.push({ Key });
        }
      });
      await storage.deleteObjects(deleteParams).promise();

      if (listedObjects.IsTruncated) {
        // if there are more than 1000 items (TODO: TEST this)
        await deleteDirectory({ userId, safeId });
      }
    } catch (error) {
      throw new Error('Files could not be deleted');
    }
  };

  router.post('/createSafe', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      console.log('createSafe', userId);

      const user = await User.findById<Document & TUser>(userId);
      if (!user) {
        res.status(400).json({ message: 'User not found' });
        return;
      }
      const safe = new Safe({
        name: req.body.name.trim(),
        description: '',
        autoSharing: false,
        emails: [],
        phones: [],
      });
      user.safes?.push(safe);
      await user.save();
      res.json(safe);
    } catch (error) {
      next(error); // Properly forward error to error handling middleware
    }
  });

  router.post('/updateSafe', async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const body = req.body as TSafe;
      const field = body.fieldToUpdate;

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        res.status(400).json({ message: 'User not found' });
        return;
      }
      const safe = (await findSafeById(user, body._id)) as TSafe;

      if (field === 'description') {
        safe.description = body.description;
      } else if (field === 'name') {
        safe.name = body.name;
      } else if (field === 'autoSharing') {
        safe.autoSharing = body.autoSharing;
      }

      await user.save();
      res.json(safe);
      return;
    } catch (error) {
      next(error);
    }
  });

  router.post('/updateContacts', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // @ts-ignore
      const userId = req.context.userId;

      const { contactType, contactList, deleteContactList, safeId } = req.body as TContactUpdate;

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user || !contactType) {
        res.status(400).json({ message: 'User not found' });
        return;
      }
      const safe = (await findSafeById(user, safeId)) as TSafe;

      // ADD NEW
      if (contactList.length > 0 && !contactList[0]?._id) {
        const contact = new Contact({
          name: contactList[0]?.name,
          contact: contactList[0]?.contact,
          type: contactType === 'emails' ? 'email' : 'phone',
        });
        safe[contactType]?.push(contact);
      }
      // EDIT
      else if (contactList.length > 0 && contactList[0]?._id) {
        const updateContact = safe[contactType]?.filter(
          (contact) => contact._id.toString() === contactList[0]?._id,
        )[0];

        if (!updateContact) return;
        updateContact.name = contactList[0]?.name;
        updateContact.contact = contactList[0]?.contact;
      }
      // DELETE
      else if (deleteContactList.length > 0) {
        safe[contactType] = safe[contactType]?.filter(
          (contact) => !deleteContactList.includes(contact._id.toString()),
        );
      }

      await user.save();
      res.json(safe);
      return
    } catch (error) {
      next(error);
    }
  });

  router.post('/deleteSafeList', async (req: Request, res: Response, next: NextFunction) : Promise<void>=> {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { safeIdList } = req.body as { safeIdList: string[] };

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        res.status(400).json({ message: 'User not found' });
        return
      }
      const updatedList = user.safes.filter((safe) => {
        const currId = safe._id?.toString();
        if (!currId) return false;
        return !(safeIdList as Array<string>).includes(currId);
      });
      user.safes = updatedList;
      await user.save();

      // the reason to use map and Promise.all is to properly catch exception in deleteDirectory
      const deletePromises = safeIdList.map(async (safeId) => {
        try {
          await deleteDirectory({ userId, safeId });
        } catch (error) {
          throw new Error(`Failed to delete directory for safeId: ${safeId}`);
        }
      });
      await Promise.all(deletePromises);

      res.json({ safeIdList });
      return;
    } catch (error) {
      next(error);
    }
  });

  router.get('/getSafe/:safeId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { safeId } = req.params;
      console.log('getSafe', userId);

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        res.status(400).json({ message: 'User not found' });
        return;
      }
      const safe = await findSafeById(user, safeId);

      res.json(safe);
      return;
    } catch (error) {
      next(error); // Properly forward error to error handling middleware
    }
  });

  return router;
};

export default safeRouter;
