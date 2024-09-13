import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

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
