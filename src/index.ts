/// <reference path="./types/typing.d.ts" />
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AWS from 'aws-sdk';
import authRouter from './controllers/authRouter';
import uncaughtException from './middleware/uncaughtException';
import authorization from './middleware/authorization';
import activityLog from './middleware/activityLog';
import safeRouter from './controllers/safeRouter';
import filesRouter from './controllers/filesRouter';
import userRouter from './controllers/userRouter';
import searchRouter from './controllers/searchRouter';
import Agenda from 'agenda';
import { configNotification, scheduleNotificationToClients } from './agenda/ScheduleNotification';

dotenv.config();
const PORT: number = parseInt(process.env.PORT as string, 10);

const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // TODO: might be built in. Double check

mongoose
  .connect(process.env.MONGO_URI as string, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log('DB Connected!');
  })
  .catch((err) => {
    console.error('DB Connection error:', err);
  });

const conn = mongoose.connection;
let agenda: Agenda;

conn.once('open', async () => {
  const storage = new AWS.S3({
    endpoint: process.env.STORAGE_ENDPOINT,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  });
  agenda = new Agenda({
    db: { address: process.env.MONGO_URI as string },
    processEvery: '1 minute',
  });
  agenda
    .on('ready', () => console.log('Agenda started!'))
    .on('error', (error) => console.error('Agenda connection error:', error));

  await scheduleNotificationToClients(agenda);
  configNotification(agenda);

  app.use('/legacy/public', authRouter(storage), activityLog);
  app.use('/legacy/private', authorization, userRouter(storage, agenda), activityLog);
  app.use('/legacy/private', authorization, safeRouter(storage)), activityLog;
  app.use('/legacy/private', authorization, filesRouter(storage), activityLog);
  app.use('/legacy/private', authorization, searchRouter(storage), activityLog);
  app.use(uncaughtException);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function signalHandler(signal: string) {
  console.log(`Process ${process.pid} received a SIGTERM signal:`, signal);
  agenda.stop();
  conn.close();
  process.exit();
}
process.on('SIGINT', signalHandler);
process.on('SIGTERM', signalHandler);
process.on('SIGQUIT', signalHandler);
