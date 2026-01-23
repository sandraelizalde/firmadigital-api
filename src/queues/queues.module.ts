import { Module } from '@nestjs/common';
import { notificationQueueProvider } from './notification.queue';

@Module({
  providers: [notificationQueueProvider],
  exports: [notificationQueueProvider],
})
export class QueuesModule {}
