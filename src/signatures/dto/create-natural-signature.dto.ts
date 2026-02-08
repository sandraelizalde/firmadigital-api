import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  Matches,
  Length,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';

export class CreateNaturalSignatureDto {
  @ApiProperty({
    description: 'Nombres del solicitante',
    example: 'LUIS XAVIER',
  })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({
    description: 'Apellidos del solicitante',
    example: 'GONZALEZ JIMENEZ',
  })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiProperty({
    description: 'Número de cédula o pasaporte',
    example: '1752549467',
    minLength: 5,
    maxLength: 12,
  })
  @IsString()
  @IsNotEmpty()
  numero_identificacion: string;

  @ApiProperty({
    description: 'Código dactilar',
    example: 'V43I4444',
  })
  @IsString()
  @IsOptional()
  codigo_dactilar?: string;

  @ApiProperty({
    description: 'Correo electrónico del solicitante',
    example: 'luisg@solucionesnexus.com',
  })
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @ApiProperty({
    description: 'Provincia',
    example: 'PICHINCHA',
  })
  @IsString()
  @IsNotEmpty()
  provincia: string;

  @ApiProperty({
    description: 'Ciudad',
    example: 'QUITO',
  })
  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @ApiProperty({
    description: 'Parroquia',
    example: 'IÑAQUITO',
  })
  @IsString()
  @IsNotEmpty()
  parroquia: string;

  @ApiProperty({
    description: 'Dirección completa',
    example: 'QUITUS COLONIAL',
  })
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @ApiProperty({
    description: 'Número de celular',
    example: '0990602199',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  @Matches(/^[0-9]+$/, { message: 'El celular debe contener solo números' })
  celular: string;

  @ApiProperty({
    description: 'Clave de firma digital',
    example: 'GONZALEZ1752',
  })
  @IsString()
  @IsNotEmpty()
  clave_firma: string;

  @ApiProperty({
    description: 'Foto frontal de cédula en Base64',
    example: 'iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsNotEmpty()
  foto_frontal: string;

  @ApiProperty({
    description: 'Foto posterior de cédula en Base64',
    example: 'iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsString()
  @IsNotEmpty()
  foto_posterior: string;

  @ApiProperty({
    description: 'ID del plan asignado al distribuidor',
    example: 'clx123abc456',
  })
  @IsString()
  @IsNotEmpty()
  plan_id: string;

  @ApiProperty({
    description: 'Fecha de nacimiento en formato ISO',
    example: '1990-05-15',
  })
  @IsDateString()
  @IsNotEmpty()
  fecha_nacimiento: string;

  @ApiProperty({
    description: 'RUC (opcional, solo si la persona natural tiene RUC)',
    example: '1752549467001',
    required: false,
  })
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiProperty({
    description: 'Tipo de documento: CEDULA o PASAPORTE',
    example: 'CEDULA',
    enum: ['CEDULA', 'PASAPORTE'],
    required: false,
    default: 'CEDULA',
  })
  @IsNotEmpty()
  @IsEnum(['CEDULA', 'PASAPORTE'])
  documento: 'CEDULA' | 'PASAPORTE';

  @ApiProperty({
    description: 'Si usa token Uanataca',
    example: false,
    required: false,
    default: false,
  })
  @IsNotEmpty()
  @IsEnum(['true', 'false'])
  usa_token: string;

  // ===== Campos opcionales para Uanataca (pasaporte/token) =====

  @ApiProperty({
    description: 'Sexo del solicitante (requerido para Uanataca)',
    example: 'HOMBRE',
    enum: ['HOMBRE', 'MUJER'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['HOMBRE', 'MUJER'])
  sexo?: 'HOMBRE' | 'MUJER';

  @ApiProperty({
    description: 'Selfie en Base64 (requerido para Uanataca)',
    example: 'iVBORw0KGgoAAAANSUhEUgAA...',
    required: false,
  })
  @IsOptional()
  @IsString()
  selfie?: string;
}
