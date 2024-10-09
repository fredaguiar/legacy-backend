import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { generateToken } from '../utils/JwtUtil';
import { emailConfirm } from './messageBody';
import logger from '../logger';

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

type TResendConfirmationEmailProps = { user: TUser };

export const sendConfirmationEmail = async ({ user }: TResendConfirmationEmailProps) => {
  // Verify Email
  // TODO: this token should be only valid for confirmLifeCheckByEmail.
  // TODO: Config jwt to store some sort of permission, or expiration
  const userId = user._id.toString();
  try {
    const token = generateToken({ id: user._id.toString() });
    const host = `${process.env.HOSTNAME}:${process.env.PORT}`;
    const url = new URL(`/legacy/external/confirmEmail?id=${token}`, host).toString();
    const mailOptions: Mail.Options = {
      from: 'fatstrategy@gmail.com',
      to: user.email,
      subject: 'Legacy - Confirm your email',
      html: emailConfirm({ firstName: user.firstName, url }),
      priority: 'high',
    };
    sendEmail({ mailOptions, userId: user._id });
    logger.info(`send Confirmation Email - email: ${user.email}. UserId: ${userId}`);
  } catch (error) {
    logger.error(`Error sending Confirmation emails for userId: ${userId}. Error: ${error}`);
  }
};

type TSendEmailProps = { mailOptions: Mail.Options; userId: string };

export const sendEmail = async ({ mailOptions, userId }: TSendEmailProps) => {
  try {
    transporter
      .sendMail(mailOptions)
      .then((info) => logger.info('Email sent: ' + info.response))
      .catch((error) => {
        logger.error('Error sending email: ' + error);
      });
  } catch (error) {
    logger.error(`Error sending emails for userId: ${userId}. Error: ${error}`);
  }
};
