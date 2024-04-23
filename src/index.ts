import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import Grid from 'gridfs-stream';
import dotenv from 'dotenv';
import authRouter from './controllers/authRouter';
import uncaughtException from './middleware/uncaughtException';
import authorization from './middleware/authorization';
import safeRouter from './controllers/safeRouter';
import { GridFsStorage } from 'multer-gridfs-storage';
import multer from 'multer';
import uploadRouter from './controllers/uploadRouter';

dotenv.config();
const PORT: number = parseInt(process.env.PORT as string, 10);

// const gfs = Grid(dbConnection.db, mongoose.mongo);
// gfs.collection('uploads');
// const storage = new GridFsStorage({
//   db: dbConnection.db,
//   file: (req, file) => {
//     return {
//       filename: 'file_' + Date.now(),
//       bucketName: 'uploads', // collection name in GridFS
//     };
//   },
// });
// const upload = multer({ storage: storage });

const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // TODO: might be built in. Double check

app.use('/legacy/public', authRouter);
app.use('/legacy/private', authorization, safeRouter);
// app.use('/legacy/private', authorization, uploadRouter(dbConnection));
app.use('test', (req, res) => res.json('OK'));

mongoose
  .connect('mongodb://localhost:27017/legacy', {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log('DB Connected!');
  })
  .catch((err) => {
    console.error('DB Connection error:', err);
  });

const conn = mongoose.connection;
conn.on('connected', () => {
  const gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
  const storage = new GridFsStorage({
    db: conn.db,
  });
  const multerInstance = multer({ storage: storage });
  app.use('/legacy/private', authorization, uploadRouter(multerInstance));
  console.log('Start Grids connection!');
});

app.use(uncaughtException); // keep it after routers

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
