import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  providers: [MailService, PdfGeneratorService],
  exports: [MailService],
})
export class MailModule {}
