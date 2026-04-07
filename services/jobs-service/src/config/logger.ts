import { createLogger, format, transports } from 'winston';
import { env } from './env';

const isProduction = env.NODE_ENV === 'production';

export const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: isProduction
    ? format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      )
    : format.combine(
        format.colorize(),
        format.timestamp({ format: 'HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${env.SERVICE_NAME}] ${level}: ${message}${metaStr}`;
        }),
      ),
  transports: [new transports.Console()],
  defaultMeta: { service: env.SERVICE_NAME },
});
