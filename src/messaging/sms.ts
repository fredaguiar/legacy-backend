import twilio from 'twilio';

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
