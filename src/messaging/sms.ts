import twilio from 'twilio';
import logger from '../logger';
import { smsConfirmPhone } from './messageBody';

type TSendSmsProps = { body: string; userId: string; to: string };

export const sendSms = async ({ userId, body, to }: TSendSmsProps) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE;
  try {
    const client = twilio(accountSid, authToken);
    const result = await client.messages.create({ body, from: twilioPhone, to });
    logger.info(`SMS for userId: ${userId}. Result ${result}`);
  } catch (error) {
    logger.error(`Error sending SMS for userId ${userId}. Error: ${error}`);
    // logger.debug(
    //   `TWILIO_ACCOUNT_SID: ${accountSid}. TWILIO_AUTH_TOKEN: ${accountSid}. TWILIO_PHONE: ${twilioPhone}`,
    // );
    throw error;
  }
};

type TResendConfirmationMobileProps = { user: TUser };

export const sendConfirmationMobile = async ({ user }: TResendConfirmationMobileProps) => {
  try {
    const to = `+${user.phoneCountry.trim()}${user.phone.trim()}`;
    sendSms({
      userId: user._id.toString(),
      body: smsConfirmPhone({ firstName: user.firstName, verifyCode: user.mobileVerifyCode || 0 }),
      to,
    });
    logger.info(`send Confirmation Mobile - phone # ${to}. UserId: ${user._id.toString()}`);
  } catch (error: any) {
    logger.error(
      `Error sending Confirmation Mobile SMS for userId: ${user._id.toString()}. Error:  + ${error}`,
    );
  }
};
