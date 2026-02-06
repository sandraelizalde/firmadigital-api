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

export class CreateJuridicalSignatureDto {
  @ApiProperty({
    description: 'Nombres del representante legal',
    example: 'LUIS XAVIER',
  })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({
    description: 'Apellidos del representante legal',
    example: 'GONZALEZ JIMENEZ',
  })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiProperty({
    description: 'Número de cédula del representante legal',
    example: '1752549467',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
  cedula: string;

  @ApiProperty({
    description: 'Código dactilar',
    example: 'V43I4444',
  })
  @IsString()
  @IsNotEmpty()
  codigo_dactilar: string;

  @ApiProperty({
    description: 'Correo electrónico',
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
    description: 'Dirección completa de la empresa',
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
    description: 'RUC de la empresa',
    example: '1752549467001',
    minLength: 13,
    maxLength: 13,
  })
  @IsString()
  @IsNotEmpty()
  @Length(13, 13)
  @Matches(/^[0-9]+$/, { message: 'El RUC debe contener solo números' })
  ruc: string;

  @ApiProperty({
    description: 'Razón social de la empresa',
    example: 'DISTRIBUIDORA GONZALEZ S.A.',
  })
  @IsString()
  @IsNotEmpty()
  razon_social: string;

  @ApiProperty({
    description: 'Nombre completo del representante legal',
    example: 'LUIS XAVIER GONZALEZ JIMENEZ',
  })
  @IsString()
  @IsNotEmpty()
  rep_legal: string;

  @ApiProperty({
    description: 'Cargo del representante legal',
    example: 'GERENTE GENERAL',
  })
  @IsString()
  @IsNotEmpty()
  cargo: string;

  @ApiProperty({
    description: 'Clave de firma digital',
    example: 'GONZALEZ1752',
  })
  @IsString()
  @IsNotEmpty()
  clavefirma: string;

  @ApiProperty({
    description: 'Foto frontal de cédula en Base64',
    example: 'iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsString()
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
    description: 'PDF del SRI en Base64',
    example: 'JVBERi0xLjQKJeLjz9MKMSAw...',
  })
  @IsString()
  @IsNotEmpty()
  pdfSriBase64: string;

  @ApiProperty({
    description: 'Documento de nombramiento en Base64',
    example: 'JVBERi0xLjQKJeLjz9MKMSAw...',
  })
  @IsString()
  @IsNotEmpty()
  nombramientoBase64: string;

  @ApiProperty({
    description: 'ID del plan asignado al distribuidor',
    example: 'clx123abc456',
  })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    description: 'Fecha de nacimiento del representante en formato ISO',
    example: '1990-05-15',
  })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({
    description: 'Tipo de documento: CEDULA o PASAPORTE',
    example: 'CEDULA',
    enum: ['CEDULA', 'PASAPORTE'],
    required: false,
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
  @IsBoolean()
  usaToken: boolean;
}
