import Expo, { ExpoPushMessage, ExpoPushToken } from 'expo-server-sdk';

const expo = new Expo({
  // accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
});

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
