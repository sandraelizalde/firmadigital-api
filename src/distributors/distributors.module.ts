import { Module } from '@nestjs/common';
import { DistributorsController } from './distributors.controller';
import { DistributorsService } from './distributors.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [DistributorsController],
  providers: [DistributorsService],
  exports: [DistributorsService],
})
export class DistributorsModule {}
