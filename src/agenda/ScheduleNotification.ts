import { Document } from 'mongoose';
import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import Expo, { ExpoPushMessage, ExpoPushToken } from 'expo-server-sdk';
import Agenda, { Job } from 'agenda';
import User from '../models/User';

export const SEND_NOTIFICATION = 'SEND_NOTIFICATION';
export const SEND_NOTIFICATION_TO_CONTACTS = 'SEND_NOTIFICATION_TO_CONTACTS';

// optionally providing an access token if you have enabled push security
const expo = new Expo({
  // accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true, // this can be set to true in order to use the FCM v1 API
});

// TODO: should be enviroment vars
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fatstrategy@gmail.com',
    pass: 'Legacy123!@#',
  },
});

export const configNotification = (agenda: Agenda) => {
  agenda.define(SEND_NOTIFICATION, async (job: Job<ILifeCheck>) => {
    const { userId } = job.attrs.data.lifeCheckInfo;

    const user = await User.findById<Document & TUser>(userId).exec();
    if (!user) {
      console.log(`User ID ${userId} not found`);
      return;
    }

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

    // these conditions should always be false (Typescript safety)
    if (user.lifeCheck.noAnswerCounter === undefined) user.lifeCheck.noAnswerCounter = 0;
    if (user.lifeCheck.shareCountNotAnswered === undefined)
      user.lifeCheck.shareCountNotAnswered = 3;

    user.lifeCheck.noAnswerCounter++;
    await user.save();

    // if user NO answer has reached limit, then schedule notification to contacts
    // if (user.lifeCheck.noAnswerCounter >= user.lifeCheck.shareCountNotAnswered) {
    //   const notificationData: ILifeCheck = { lifeCheckInfo: { userId } };
    //   const when = `in ${user.lifeCheck.shareCount} ${user.lifeCheck.shareCountType}`;

    //   await agenda.cancel({ name: SEND_NOTIFICATION_TO_CONTACTS });
    //   await agenda.start();
    //   await agenda.schedule(when, SEND_NOTIFICATION_TO_CONTACTS, notificationData);
    // }
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
        lifeCheck: { noAnswerCounter, shareCountNotAnswered },
      }: TUser = user;

      if (noAnswerCounter === undefined || shareCountNotAnswered === undefined) {
        console.log('Error in scheduleNotificationToClients. Corrupted data');
        return;
      }

      // TODO: this should be tested and fixed, this logic using either > or >= could delay or advance one day
      if (noAnswerCounter > shareCountNotAnswered) {
        const emailPromises: Array<Promise<void>> = [];

        safes.forEach((safe) => {
          safe.emails?.forEach((email) => {
            let mailOptions: Mail.Options = {
              from: 'fatstrategy@gmail.com',
              to: email.contact,
              subject: 'Legacy critical notice',
              text: `This is a message regarding ${firstName} ${lastName}`,
              priority: 'high',
            };
            const prom = transporter
              .sendMail(mailOptions)
              .then((info) => console.log('Email sent: ' + info.response))
              .catch((error) => console.log('Error sending email: ' + error));
            emailPromises.push(prom);
          });
        });

        try {
          await Promise.all(emailPromises);
        } catch (error) {
          console.log('Error in sending emails from user ID: ' + _id);
        }
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
