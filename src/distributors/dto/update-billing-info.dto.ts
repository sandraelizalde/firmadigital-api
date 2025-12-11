import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IdentificationType } from '@prisma/client';

export class UpdateBillingInfoDto {
  @ApiPropertyOptional({
    description: 'Usar los mismos datos del distribuidor para facturación',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  useDistributorData?: boolean;

  @ApiPropertyOptional({
    description: 'Razón social para facturación',
    example: 'Empresa ABC S.A.',
    type: String,
  })
  @IsOptional()
  @IsString()
  socialReason?: string;

  @ApiPropertyOptional({
    description: 'Tipo de identificación para facturación',
    enum: IdentificationType,
    example: IdentificationType.RUC,
  })
  @IsOptional()
  @IsEnum(IdentificationType)
  identificationType?: IdentificationType;

  @ApiPropertyOptional({
    description: 'Número de cédula o RUC para facturación',
    example: '1234567890001',
    type: String,
  })
  @IsOptional()
  @IsString()
  identification?: string;

  @ApiPropertyOptional({
    description: 'Email para facturación',
    example: 'facturacion@empresa.com',
    type: String,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Teléfono para facturación',
    example: '0987654321',
    type: String,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Dirección para facturación',
    example: 'Av. Principal 456',
    type: String,
  })
  @IsOptional()
  @IsString()
  address?: string;
}
