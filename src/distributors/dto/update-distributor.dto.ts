import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IdentificationType } from '@prisma/client';

export class UpdateDistributorDto {
  @ApiPropertyOptional({
    description: 'Nombre del distribuidor',
    example: 'Juan',
    type: String,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellido del distribuidor',
    example: 'Pérez',
    type: String,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Razón social (para RUC)',
    example: 'Distribuidora ABC S.A.',
    type: String,
  })
  @IsOptional()
  @IsString()
  socialReason?: string;

  @ApiPropertyOptional({
    description: 'Tipo de identificación',
    enum: IdentificationType,
    example: IdentificationType.CEDULA,
  })
  @IsOptional()
  @IsEnum(IdentificationType)
  identificationType?: IdentificationType;

  @ApiPropertyOptional({
    description: 'Número de cédula o RUC',
    example: '1234567890',
    type: String,
  })
  @IsOptional()
  @IsString()
  identification?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico',
    example: 'distribuidor@example.com',
    type: String,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono',
    example: '0987654321',
    type: String,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Dirección',
    example: 'Av. Principal 123',
    type: String,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Ciudad',
    example: 'Quito',
    type: String,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Nueva contraseña (opcional, se encriptará automáticamente)',
    example: 'nuevaContraseña123',
    type: String,
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, {
    message: 'La contraseña debe tener al menos 6 caracteres',
  })
  password?: string;
}
