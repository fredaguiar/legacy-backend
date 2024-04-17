import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.prettyPrint(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console({ format: winston.format.prettyPrint() }),
  ],
});

export default logger;
