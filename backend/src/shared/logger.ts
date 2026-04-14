import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino(
  {
    base: {
      service: 'revisa-ai-backend',
      env: process.env.NODE_ENV ?? 'development',
    },
    level: 'info',
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname,service,env',
        },
      })
    : undefined
);
