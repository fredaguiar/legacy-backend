import { Document } from 'mongoose';
import nodemailer from 'nodemailer';
import os from 'os';
import { URL } from 'url';
import Mail from 'nodemailer/lib/mailer';
import Expo, { ExpoPushMessage, ExpoPushToken } from 'expo-server-sdk';
import Agenda, { Job } from 'agenda';
import User from '../models/User';
import { emailBodyLifeCheck } from './emailBody';
import { generateToken } from '../utils/JwtUtil';

export const SEND_NOTIFICATION = 'SEND_NOTIFICATION';
export const SEND_NOTIFICATION_TO_CONTACTS = 'SEND_NOTIFICATION_TO_CONTACTS';

const expo = new Expo({
  // accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
});

// TODO: should be enviroment vars
var transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'fatstrategy@gmail.com',
    pass: 'gpvqqntmkqnieswi', // Google App Password (go to google security / search for App Password)
  },
});

type TSendEmailProps = { mailOptions: Mail.Options; userId: string };

const sendEmail = async ({ mailOptions, userId }: TSendEmailProps) => {
  try {
    transporter
      .sendMail(mailOptions)
      .then((info) => console.log('Email sent: ' + info.response))
      .catch((error) => console.log('Error sending email: ' + error));
  } catch (error) {
    console.log(`Error sending emails for userId: ${userId}`);
  }
};

export const configNotification = (agenda: Agenda) => {
  agenda.define(SEND_NOTIFICATION, async (job: Job<ILifeCheck>) => {
    const { userId } = job.attrs.data.lifeCheckInfo;

    const user = await User.findById<Document & TUser>(userId).exec();
    if (!user) {
      console.log(`User ID ${userId} not found`);
      return;
    }

    // send push notification
    const pushToken = process.env.EXPO_PUSH_TOKEN as ExpoPushToken;
    if (!Expo.isExpoPushToken(process.env.EXPO_PUSH_TOKEN)) {
      console.log(`Push token ${process.env.EXPO_PUSH_TOKEN} is not a valid Expo push token`);
    }
    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      body: `Hi ${user.firstName}, Are you doing okay?`,
    };
    let ticket = await expo.sendPushNotificationsAsync([message]);
    if (ticket[0]?.status !== 'ok') {
      console.log(`Push token ticket error: ${ticket[0]?.status}`);
    }

    // send email
    // TODO: this token should be only valid for confirmLifeCheckByEmail.
    // TODO: Config jwt to store some sort of permission, or expiration
    const token = generateToken(user._id);
    const url = new URL(`/legacy/external/confirmLifeCheckByEmail?id=${token}`, os.hostname());

    const mailOptions: Mail.Options = {
      from: 'fatstrategy@gmail.com',
      to: user.email,
      subject: 'Legacy critical notice',
      html: emailBodyLifeCheck({ firstName: user.firstName, url: url.toString() }),
      priority: 'high',
    };
    console.log(`mailOptions: ${mailOptions}`);
    // sendEmail({ mailOptions, userId });

    // these conditions should always be false (Typescript safety)
    if (user.lifeCheck.noAnswerCounter === undefined) user.lifeCheck.noAnswerCounter = 0;
    if (user.lifeCheck.shareCountNotAnswered === undefined)
      user.lifeCheck.shareCountNotAnswered = 3;

    user.lifeCheck.noAnswerCounter++;
    user.lifeCheck.lastLifeCheck = new Date();
    await user.save();
  });
};

export const scheduleNotificationToClients = async (agenda: Agenda) => {
  agenda.define(SEND_NOTIFICATION_TO_CONTACTS, async (_job: Job) => {
    const usersAll = await User.find({});

    usersAll.forEach(async (user) => {
      const {
        _id,
        firstName,
        lastName,
        safes,
        lifeCheck: { noAnswerCounter, shareCountNotAnswered, lastLifeCheck },
      }: TUser = user;

      if (noAnswerCounter === undefined || shareCountNotAnswered === undefined) {
        console.log('Error in scheduleNotificationToClients. Corrupted data');
        return;
      }

      // TODO: this should be tested and fixed, this logic using either > or >= could delay or advance one day
      if (noAnswerCounter > shareCountNotAnswered) {
        safes.forEach((safe) => {
          safe.emails?.forEach((email) => {
            const mailOptions: Mail.Options = {
              from: 'fatstrategy@gmail.com',
              to: email.contact,
              subject: 'Legacy critical notice',
              text: `This is a message regarding ${firstName} ${lastName}`,
              html: `<p>This is a message regarding <strong>${firstName} ${lastName}</strong></p>`,
              priority: 'high',
            };
            sendEmail({ mailOptions, userId: _id.toString() });
          });
        });
      }
    });
  });

  // run batch job everyday at 10AM
  const cron = `0 10 * * SUN,MON,TUE,WED,THU,FRI,SAT`;
  // await agenda.cancel({ name: SEND_NOTIFICATION_TO_CONTACTS });
  await agenda.start();
  await agenda.every(cron, SEND_NOTIFICATION_TO_CONTACTS, {});

  console.log('scheduleNotificationToClients');
};
