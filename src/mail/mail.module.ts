import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { MailController } from './mail.controller';

@Module({
  controllers: [MailController],
  providers: [MailService, PdfGeneratorService],
  exports: [MailService],
})
export class MailModule {}
