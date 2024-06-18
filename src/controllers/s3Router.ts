import express, { NextFunction, Request, Response } from 'express';
import AWS from 'aws-sdk';
import fs from 'fs';
import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
// import multerS3 from 'multer-s3';
import { Readable } from 'stream';
import mongoose, { Types } from 'mongoose';
import logger from '../logger';

const s3Router = (bucket: mongoose.mongo.GridFSBucket) => {
  const router = express.Router();

  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  router.post(
    '/s3',
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          return res.status(400).send('No file uploaded');
        }

        console.log('UPLOAD TO S3:', req.file.originalname);

        // req.file.buffer

        const s3 = new AWS.S3({
          endpoint: 'sjc1.vultrobjects.com',
          accessKeyId: 'JC40MMUZZ7NZ4LE9676G',
          secretAccessKey: 'rIDqzGLVmqdGkt8ienVDclHvlVlM8DxGAIVSDFHL',
          // Optional: Specify the region if required by Vultr's Object Storage
          // region: 'your-vultr-object-storage-region',
          // Optional: Set the API version (likely not necessary for Vultr's Object Storage)
          // apiVersion: '2006-03-01',
          // Optional: Enable SSL/TLS (recommended)
          // s3ForcePathStyle: true,
          // signatureVersion: 'v4', // Use v4 signature if required
        });

        const params = {
          Bucket: 'legacy',
          Key: req.file.originalname.trim(),
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          Metadata: {
            // @ts-ignore
            userId: req.context.userId,
            // @ts-ignore
            safeId: req.body.safeId,
          },
        };

        const data = await s3.upload(params).promise();
        console.log('File uploaded successfully:', data.Location);

        return res.send(data.Location);
      } catch (error) {
        next(error); // forward error to error handling middleware
      }
    },
  );

  return router;
};

export default s3Router;
