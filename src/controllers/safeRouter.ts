import express, { NextFunction, Request, Response } from 'express';
import mongoose, { Document, Types } from 'mongoose';
import User from '../models/User';
import { Safe } from '../models/Safe';
import { Contact } from '../models/Contact';
import { findSafeById } from '../utils/QueryUtil';

const safeRouter = (bucket: AWS.S3) => {
  const router = express.Router();

  router.post('/createSafe', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      console.log('createSafe', userId);

      const user = await User.findById<Document & TUser>(userId);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
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
      return res.json(safe);
    } catch (error) {
      next(error); // Properly forward error to error handling middleware
    }
  });

  router.post('/updateSafe', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const body = req.body as TSafe;
      const field = body.fieldToUpdate;

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
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
      return res.json(safe);
    } catch (error) {
      next(error);
    }
  });

  router.post('/updateContacts', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;

      const { contactType, contactList, deleteContactList, safeId } = req.body as TContactUpdate;

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user || !contactType) {
        return res.status(400).json({ message: 'User not found' });
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
      return res.json(safe);
    } catch (error) {
      next(error);
    }
  });

  router.post('/deleteSafeList', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { safeIdList } = req.body as { safeIdList: string[] };

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const updatedList = user.safes.filter((safe) => {
        const currId = safe._id?.toString();
        if (!currId) return false;
        return !(safeIdList as Array<string>).includes(currId);
      });
      user.safes = updatedList;
      await user.save();

      // safeIdList.forEach(async (safeId) => {
      //   const files = await bucket
      //     .find({ 'metadata.safeId': safeId, 'metadata.userId': userId })
      //     .toArray();
      //   files.forEach((file) => {
      //     bucket.delete(file._id);
      //   });
      // });

      return res.json({ safeIdList });
    } catch (error) {
      next(error);
    }
  });

  router.get('/getSafe/:safeId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.context.userId;
      const { safeId } = req.params;
      console.log('getSafe', userId);

      const user = await User.findById<Document & TUser>(userId).exec();
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const safe = await findSafeById(user, safeId);

      return res.json(safe);
    } catch (error) {
      next(error); // Properly forward error to error handling middleware
    }
  });

  return router;
};

export default safeRouter;
