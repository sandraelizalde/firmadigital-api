import { Module } from '@nestjs/common';
import { DistributorsController } from './distributors.controller';
import { DistributorsService } from './distributors.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FilesModule } from 'src/files/files.module';
import { AuthModule } from 'src/auth/auth.module';
import { MailModule } from 'src/mail/mail.module';
import { CreditsModule } from 'src/credits/credits.module';

@Module({
  imports: [PrismaModule, FilesModule, AuthModule, MailModule, CreditsModule],
  controllers: [DistributorsController],
  providers: [DistributorsService],
  exports: [DistributorsService],
})
export class DistributorsModule {}
