import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { IdentificationType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDistributorDto {
  @ApiPropertyOptional({
    description: 'Nombre(s) del distribuidor (persona natural)',
    example: 'Luis Fernando',
    type: String,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellido(s) del distribuidor (persona natural)',
    example: 'González Pérez',
    type: String,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Razón social (persona jurídica)',
    example: 'Soluciones Nexus S.A.',
    type: String,
  })
  @IsOptional()
  @IsString()
  socialReason?: string;

  @ApiProperty({
    description: 'Tipo de identificación del distribuidor',
    enum: IdentificationType,
    example: IdentificationType.CEDULA,
    enumName: 'IdentificationType',
  })
  @IsNotEmpty()
  @IsEnum(IdentificationType)
  identificationType: IdentificationType;

  @ApiProperty({
    description: 'Número de cédula o RUC del distribuidor',
    example: '1752549468',
    type: String,
    minLength: 10,
    maxLength: 13,
  })
  @IsNotEmpty()
  @IsString()
  identification: string;

  @ApiProperty({
    description: 'Correo electrónico del distribuidor',
    example: 'distribuidor@example.com',
    type: String,
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Dirección física del distribuidor',
    example: 'Av. Principal 123 y Calle Secundaria',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Número de teléfono o celular del distribuidor',
    example: '0987654321',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({
    description:
      'Contraseña para acceso del distribuidor (mínimo 6 caracteres)',
    example: 'Secure123!',
    type: String,
    minLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
