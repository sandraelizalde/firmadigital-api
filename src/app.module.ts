import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PlansModule } from './plans/plans.module';
import { DistributorsModule } from './distributors/distributors.module';
import { RechargesModule } from './recharges/recharges.module';
import { FilesModule } from './files/files.module';
import { AdvertisementsModule } from './advertisements/advertisements.module';
import { SignaturesModule } from './signatures/signatures.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from './mail/mail.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CreditsModule } from './credits/credits.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),

    PrismaModule,
    AuthModule,
    PlansModule,
    DistributorsModule,
    RechargesModule,
    FilesModule,
    AdvertisementsModule,
    SignaturesModule,
    ConsultationsModule,
    MailModule,
    CreditsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
