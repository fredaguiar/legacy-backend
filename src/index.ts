import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRouter from './controllers/authRouter';
import uncaughtException from './middleware/uncaughtException';
import authorization from './middleware/authorization';

dotenv.config();
const PORT: number = parseInt(process.env.PORT as string, 10);

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/legacy/public', authRouter);
app.use('/legacy/private', authorization);
app.use(uncaughtException);

mongoose
  .connect(process.env.MONGO_URI as string, {
    serverSelectionTimeoutMS: 20000,
  })
  .then(() => {
    console.log('DB Connected!');
  });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function signalHandler(signal: string) {
  console.log(`Process ${process.pid} received a SIGTERM signal:`, signal);
  process.exit();
}
process.on('SIGINT', signalHandler);
process.on('SIGTERM', signalHandler);
process.on('SIGQUIT', signalHandler);
