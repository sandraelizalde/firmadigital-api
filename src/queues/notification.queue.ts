import { Queue } from 'bullmq';
import { redisConfig } from '../redis/redis.config';

export const NOTIFICATION_QUEUE = 'notifications';

export const notificationQueueProvider = {
  provide: 'NOTIFICATION_QUEUE',
  useFactory: () => {
    return new Queue(NOTIFICATION_QUEUE, {
      connection: redisConfig,
    });
  },
};
