import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Create a new Expo SDK client
// optionally providing an access token if you have enabled push security
let expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true, // this can be set to true in order to use the FCM v1 API
});

const pushNotification = async (pushMessage: ExpoPushMessage) => {
  try {
    const pushToken = process.env.EXPO_;
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new Error(`Push token ${pushToken} is not a valid Expo push token`);
    }

    // Construct a message (see https://docs.expo.io/push-notifications/sending-notifications/)
    let ticket = await expo.sendPushNotificationsAsync([pushMessage]);
    if (ticket[0]?.status !== 'ok') {
      throw new Error(`Push token ticket error: ${ticket[0]?.status}`);
    }
  } catch (error: any) {
    throw new Error(error);
  }
};
