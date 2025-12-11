import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdentificationType } from '@prisma/client';

export class CreateBillingInfoDto {
  @ApiProperty({
    description:
      'Usar los mismos datos del distribuidor para facturación (true) o usar datos personalizados (false)',
    example: false,
    type: Boolean,
  })
  @IsNotEmpty()
  @IsBoolean()
  useDistributorData: boolean;

  @ApiPropertyOptional({
    description:
      'Razón social para facturación (requerido si useDistributorData = false)',
    example: 'Empresa ABC S.A.',
    type: String,
  })
  @ValidateIf((o) => !o.useDistributorData)
  @IsNotEmpty()
  @IsString()
  socialReason?: string;

  @ApiPropertyOptional({
    description:
      'Tipo de identificación para facturación (requerido si useDistributorData = false)',
    enum: IdentificationType,
    example: IdentificationType.RUC,
  })
  @ValidateIf((o) => !o.useDistributorData)
  @IsNotEmpty()
  @IsEnum(IdentificationType)
  identificationType?: IdentificationType;

  @ApiPropertyOptional({
    description:
      'Número de cédula o RUC para facturación (requerido si useDistributorData = false)',
    example: '1234567890001',
    type: String,
  })
  @ValidateIf((o) => !o.useDistributorData)
  @IsNotEmpty()
  @IsString()
  identification?: string;

  @ApiPropertyOptional({
    description:
      'Email para facturación (requerido si useDistributorData = false)',
    example: 'facturacion@empresa.com',
    type: String,
  })
  @ValidateIf((o) => !o.useDistributorData)
  @IsNotEmpty()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description:
      'Teléfono para facturación (requerido si useDistributorData = false)',
    example: '0987654321',
    type: String,
  })
  @ValidateIf((o) => !o.useDistributorData)
  @IsNotEmpty()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description:
      'Dirección para facturación (requerido si useDistributorData = false)',
    example: 'Av. Principal 456',
    type: String,
  })
  @ValidateIf((o) => !o.useDistributorData)
  @IsNotEmpty()
  @IsString()
  address?: string;
}
