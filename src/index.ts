import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRouter from './controllers/authRouter';
import uncaughtException from './middleware/uncaughtException';
import authorization from './middleware/authorization';
import safeRouter from './controllers/safeRouter';
import filesRouter from './controllers/filesRouter';

dotenv.config();
const PORT: number = parseInt(process.env.PORT as string, 10);

const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // TODO: might be built in. Double check

app.use('test', (req, res) => res.json('OK'));

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
conn.once('open', () => {
  const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads',
  });
  app.use('/legacy/public', authRouter(bucket));
  app.use('/legacy/private', authorization, safeRouter(bucket));
  app.use('/legacy/private', authorization, filesRouter(bucket));
});

app.use(uncaughtException); // keep it after routers

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function signalHandler(signal: string) {
  console.log(`Process ${process.pid} received a SIGTERM signal:`, signal);
  conn.close();
  process.exit();
}
process.on('SIGINT', signalHandler);
process.on('SIGTERM', signalHandler);
process.on('SIGQUIT', signalHandler);
