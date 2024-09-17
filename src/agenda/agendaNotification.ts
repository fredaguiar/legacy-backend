import { Document } from 'mongoose';
import { URL } from 'url';
import Mail from 'nodemailer/lib/mailer';
import S3 from 'aws-sdk/clients/s3';
import Agenda, { Job } from 'agenda';
import User from '../models/User';
import {
  emailBodyLifeCheck,
  emailBodyToContacts,
  smsBodyLifecheck,
  smsBodyToContacts,
} from '../messaging/messageBody';
import { generateToken } from '../utils/JwtUtil';
import { countDays } from '../utils/DateUtil';
import { bucketFilePath } from '../utils/FileUtil';
import { sendEmail } from '../messaging/email';
import { sendLifeCheckPushNotification } from '../messaging/pushNotification';
import { sendSms } from '../messaging/sms';

export const SEND_NOTIFICATION = 'SEND_NOTIFICATION';
export const SEND_NOTIFICATION_TO_CONTACTS = 'SEND_NOTIFICATION_TO_CONTACTS';

const DOCUMENT_FILENAME = 'documents.txt';
const PASSWORD_FILENAME = 'passwords.txt';

export const configNotification = (agenda: Agenda) => {
  agenda.define(SEND_NOTIFICATION, async (job: Job<ILifeCheck>) => {
    const { userId } = job.attrs.data.lifeCheckInfo;
    // const userId = '66993fb03a0f437f99164cc8';

    const user = await User.findById<Document & TUser>(userId).exec();
    if (!user) {
      console.log(`User ID ${userId} not found`);
      return;
    }

    // TODO: this token should be only valid for confirmLifeCheckByEmail.
    // TODO: Config jwt to store some sort of permission, or expiration
    const token = generateToken({ id: user._id.toString() });
    const host = `${process.env.HOSTNAME}:${process.env.PORT}`;
    const url = new URL(`/legacy/external/confirmLifeCheckByEmail?id=${token}`, host).toString();
    const { firstName } = user;
    const mailOptions: Mail.Options = {
      from: 'fatstrategy@gmail.com',
      to: user.email,
      subject: 'Legacy status check! Please confirm!',
      html: emailBodyLifeCheck({ firstName, url }),
      priority: 'high',
    };

    sendLifeCheckPushNotification({
      body: `Hi ${firstName}, please confirm you received this message.`,
      userId,
    });
    sendSms({
      userId,
      body: smsBodyLifecheck({ firstName, url }),
      to: `+${user.phoneCountry.trim()}${user.phone.trim()}`,
    });
    sendEmail({ mailOptions, userId });

    // these conditions should always be false (Typescript safety)
    if (user.lifeCheck.noAnswerCounter === undefined) user.lifeCheck.noAnswerCounter = 0;

    user.lifeCheck.noAnswerCounter++;
    user.lifeCheck.lastLifeCheck = new Date();
    await user.save();
  });
};

type TAttachPasswordFiles = {
  storage: S3;
  userId: string;
  safe: TSafe;
  continuationToken?: string;
};

const createPasswordFiles = async ({ storage, userId, safe }: TAttachPasswordFiles) => {
  try {
    const passes =
      safe.files
        ?.filter((file) => file.mimetype === 'text/pass')
        .map((pass) => {
          return `Title: ${pass.fileName}\nUsername: ${pass.username}\nPassword: ${pass.password}\n`;
        }) || [];

    const content = `Shared passwords\n\n${passes.join('\n\n')}`;

    const params = {
      Bucket: process.env.STORAGE_BUCKET as string,
      Key: bucketFilePath({ userId, safeId: safe._id.toString(), fileId: PASSWORD_FILENAME }),
      Body: Buffer.from(content),
      ContentType: 'text/plain',
    };

    const data = await storage.putObject(params).promise();
    console.log(`Passwords files saved successfully: ${data.ETag}`);
  } catch (error) {
    throw new Error('Password files could not be created');
  }
};

const createTextEditFiles = async ({ storage, userId, safe }: TAttachPasswordFiles) => {
  try {
    const notes =
      safe.files
        ?.filter((file) => file.mimetype === 'text/editor')
        .map((text) => {
          console.log(' extractedText text', text.notes);
          return `Title: ${text.fileName}\n\nUsername: ${text.notes}\n\n\n`;
        }) || [];

    // TODO: it should be converted to pdf
    const content = `Documents\n\n\n${notes.join('\n\n\n\n\n')}`;
    // const extractedText = await extractText(Buffer.from(content), 'text/editor');
    // console.log(' extractedText', extractedText);

    const params = {
      Bucket: process.env.STORAGE_BUCKET as string,
      Key: bucketFilePath({ userId, safeId: safe._id.toString(), fileId: DOCUMENT_FILENAME }),
      Body: Buffer.from(content),
      ContentType: 'text/plain',
    };

    const data = await storage.putObject(params).promise();
    console.log(`document files saved successfully: ${data.ETag}`);
  } catch (error) {
    throw new Error('Text Edit files could not be created');
  }
};

type TAttachFiles = {
  storage: S3;
  userId: string;
  safe: TSafe;
  continuationToken?: string;
};

const attachFiles = async ({ storage, userId, safe, continuationToken }: TAttachFiles) => {
  try {
    const attachments: Array<Mail.Attachment> = [];
    // listObjectsV2 returns up to 1000
    const listedObjects = await storage
      .listObjectsV2({
        Bucket: process.env.STORAGE_BUCKET as string,
        Prefix: `${userId}/${safe._id}/`,
        // ContinuationToken: continuationToken,
      })
      .promise();
    if (!listedObjects || !listedObjects.Contents || listedObjects.Contents.length === 0) {
      return [];
    }

    const fileMap = new Map<string, TFile>();
    safe.files?.forEach((file) => {
      fileMap.set(file._id.toString(), file);
    });
    if (fileMap === undefined || fileMap.size === 0) return [];

    listedObjects.Contents.forEach(({ Key }) => {
      if (Key) {
        let filename = Key.split('/').pop();
        if (filename && filename !== PASSWORD_FILENAME && filename !== DOCUMENT_FILENAME) {
          const file = fileMap.get(filename);
          filename = file?.fileName;
        }
        if (filename) {
          attachments.push({
            filename,
            path: storage.getSignedUrl('getObject', {
              Bucket: process.env.STORAGE_BUCKET as string,
              Key,
            }),
          });
        }
      }
    });

    if (listedObjects.IsTruncated) {
      // if there are more than 1000 items (TODO: TEST this)
      attachments.concat(
        await attachFiles({
          storage,
          userId,
          safe,
          continuationToken: listedObjects.ContinuationToken,
        }),
      );
    }

    return attachments;
  } catch (error) {
    throw new Error('Files could not attached');
  }
};

export const scheduleNotificationToContacts = async (storage: S3, agenda: Agenda) => {
  agenda.define(SEND_NOTIFICATION_TO_CONTACTS, async (_job: Job) => {
    const usersAll = await User.find({});

    usersAll.forEach(async (user) => {
      const {
        _id,
        firstName,
        lastName,
        safes,
        lifeCheck: {
          noAnswerCounter,
          shareCountNotAnswered,
          lastLifeCheck,
          shareCountType,
          shareCount,
        },
      }: TUser = user;

      const userId = _id.toString();

      if (noAnswerCounter === undefined || shareCountNotAnswered === undefined) {
        console.log('Error in scheduleNotificationToClients. Corrupted data');
        return;
      }

      // TODO: this should be tested and fixed, this logic using either > or >= could delay or advance one day
      if (noAnswerCounter > shareCountNotAnswered) {
        const daysSinceLastNotificationRequest = countDays(lastLifeCheck, new Date());
        let shareCountMaxDays = shareCount || 1; // if shareCountType = days
        if (shareCountType === 'weeks') {
          shareCountMaxDays = shareCountMaxDays * 7;
        }

        if (daysSinceLastNotificationRequest >= shareCountMaxDays) {
          safes
            .filter((safe) => safe.autoSharing)
            .forEach(async (safe) => {
              await createPasswordFiles({ storage, userId, safe });
              await createTextEditFiles({ storage, userId, safe });
              const attachments = await attachFiles({ storage, safe, userId });

              safe.emails?.forEach((email) => {
                const mailOptions: Mail.Options = {
                  from: 'fatstrategy@gmail.com',
                  to: email.contact,
                  subject: 'Legacy critical notice',
                  html: emailBodyToContacts({ firstName, lastName, attachments }),
                  priority: 'high',
                  // attachments,
                };
                sendEmail({ mailOptions, userId: _id.toString() });
              });

              safe.phones?.forEach(async (phone) => {
                const body = await smsBodyToContacts({ firstName, lastName, attachments });
                sendSms({ userId, body, to: phone.contact });
              });
            });
        }
      }
    });
  });

  // run batch job everyday at 11AM
  const cron = `0 11 * * SUN,MON,TUE,WED,THU,FRI,SAT`;
  // await agenda.cancel({ name: SEND_NOTIFICATION_TO_CONTACTS });
  await agenda.start();
  await agenda.every(cron, SEND_NOTIFICATION_TO_CONTACTS, {});
  console.log('Schedule notification to contacts Started!');
};
