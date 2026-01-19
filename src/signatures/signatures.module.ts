import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { SignaturesController } from './signatures.controller';
import { SignaturesService } from './signatures.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from 'src/files/files.module';
import { CreditsModule } from 'src/credits/credits.module';

@Module({
  imports: [PrismaModule, ConfigModule, HttpModule, FilesModule, CreditsModule],
  controllers: [SignaturesController],
  providers: [SignaturesService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
