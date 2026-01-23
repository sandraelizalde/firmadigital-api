import { Module, Global } from '@nestjs/common';
import { notificationQueueProvider } from './notification.queue';

@Global()
@Module({
  providers: [notificationQueueProvider],
  exports: ['NOTIFICATION_QUEUE'],
})
export class QueuesModule {}
