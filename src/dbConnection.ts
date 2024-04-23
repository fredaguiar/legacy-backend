import mongoose, { Mongoose } from 'mongoose';

const dbConnection = mongoose.createConnection('mongodb://localhost:27017/legacy', {
  serverSelectionTimeoutMS: 5000,
});

dbConnection.on('error', (err) => {
  console.error('Connection error:', err);
});

dbConnection.once('open', () => {
  console.log('Connection successful');
});

export default dbConnection;
