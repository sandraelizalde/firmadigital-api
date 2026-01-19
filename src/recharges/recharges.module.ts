import { Module } from '@nestjs/common';
import { RechargesService } from './recharges.service';
import { RechargesController } from './recharges.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from '../files/files.module';
import { CreditsModule } from '../credits/credits.module';
import { PayphoneService } from './payphone.service';

@Module({
  imports: [PrismaModule, FilesModule, CreditsModule],
  controllers: [RechargesController],
  providers: [RechargesService, PayphoneService],
  exports: [RechargesService],
})
export class RechargesModule {}
