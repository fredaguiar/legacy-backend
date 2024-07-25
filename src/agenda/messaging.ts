import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import Expo, { ExpoPushMessage, ExpoPushToken } from 'expo-server-sdk';
import twilio from 'twilio';

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
    pass: 'uqltynlctsztqyds', // Google App Password (go to google security / search for App Password)
  },
});

type TSendEmailProps = { mailOptions: Mail.Options; userId: string };

export const sendEmail = async ({ mailOptions, userId }: TSendEmailProps) => {
  try {
    transporter
      .sendMail(mailOptions)
      .then((info) => console.log('Email sent: ' + info.response))
      .catch((error) => {
        console.log('Error sending email: ' + error);
      });
  } catch (error) {
    console.log(`Error sending emails for userId: ${userId}`);
  }
};

type TSendSmsProps = { body: string; userId: string; to: string };

export const sendSms = async ({ userId, body, to }: TSendSmsProps) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);

    const result = await client.messages.create({ body, from: process.env.TWILIO_PHONE, to });
    console.log(`SMS for userId: ${userId}`, result);
  } catch (error) {
    console.log(`Error sending SMS for userId ${userId}. Error: ${error}`);
  }
};

type TSendPushNotificationProps = { body: string; userId: string };

export const sendLifeCheckPushNotification = async ({
  body,
  userId,
}: TSendPushNotificationProps) => {
  try {
    const pushToken = process.env.EXPO_PUSH_TOKEN as ExpoPushToken;
    if (!Expo.isExpoPushToken(pushToken)) {
      console.log(`Push token ${pushToken} is not a valid Expo push token`);
    }
    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      body,
    };
    let ticket = await expo.sendPushNotificationsAsync([message]);
    if (ticket[0]?.status !== 'ok') {
      console.log(`Push token ticket error: ${ticket[0]?.status}`);
    }
  } catch (error) {
    console.log(`Error sending SMS for userId: ${userId}`);
  }
};
