import twilio from 'twilio';
import logger from '../logger';
import { smsConfirmPhone } from './messageBody';

type TSendSmsProps = { body: string; userId: string; to: string };

export const sendSms = async ({ userId, body, to }: TSendSmsProps) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE;
  const client = twilio(accountSid, authToken);

  try {
    const result = await client.messages.create({ body, from: twilioPhone, to });
    logger.info(`SMS for userId: ${userId}. Result ${result}`);
  } catch (error) {
    logger.error(
      `sendSms - Error sending SMS for userId ${userId}. Error: ${error}` +
        `accountSid ${accountSid} - authToken ${authToken}. - twilioPhone ${twilioPhone}.`,
    );
    throw error;
  }
};

// export const sendSms = async ({ userId, body, to }: TSendSmsProps) => {
//   try {
//     const accountSid = process.env.TWILIO_ACCOUNT_SID;
//     const authToken = process.env.TWILIO_AUTH_TOKEN;
//     const client = twilio(accountSid, authToken);

//     const result = await client.messages.create({ body, from: process.env.TWILIO_PHONE, to });
//     console.log(`SMS for userId: ${userId}`, result);
//   } catch (error) {
//     console.log(`Error sending SMS for userId ${userId}. Error: ${error}`);
//   }
// };

type TResendConfirmationMobileProps = { user: TUser };

export const sendConfirmationMobile = async ({ user }: TResendConfirmationMobileProps) => {
  const to = `+${user.phoneCountry.trim()}${user.phone.trim()}`;
  const body = {
    userId: user._id.toString(),
    body: smsConfirmPhone({ firstName: user.firstName, verifyCode: user.mobileVerifyCode || 0 }),
    to,
  };
  try {
    await sendSms(body);
    logger.info(`send Confirmation Mobile - phone # ${to}. UserId: ${user._id.toString()}`);
  } catch (error: any) {
    logger.error(
      `Error sending Confirmation Mobile SMS for userId: ${user._id.toString()}. Error:  + ${error}` +
        `\nJSON:  + ${JSON.stringify(body)}`,
    );
    throw new Error(error);
  }
};
