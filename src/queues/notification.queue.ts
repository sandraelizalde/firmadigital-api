import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { redisConfig } from '../redis/redis.config';

export const NOTIFICATION_QUEUE = 'notifications';

const logger = new Logger('NotificationQueue');

export const notificationQueueProvider = {
  provide: 'NOTIFICATION_QUEUE',
  useFactory: () => {
    // Si REDIS_ENABLED no está configurado o es false, no crear la cola ni intentar conectar
    if (process.env.REDIS_ENABLED !== 'true') {
      logger.warn(
        'Redis está deshabilitado. Las colas de notificaciones no estarán disponibles.',
      );
      return null;
    }
    // Aquí se podría crear la cola si se habilita Redis en el futuro
    return null;
  },
};
