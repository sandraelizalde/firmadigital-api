import { Module } from '@nestjs/common';
import { RechargesService } from './recharges.service';
import { RechargesController } from './recharges.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RechargesController],
  providers: [RechargesService],
  exports: [RechargesService],
})
export class RechargesModule {}
