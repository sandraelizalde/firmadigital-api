import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  Matches,
  Length,
  IsEnum,
  IsOptional,
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
    description: 'Número de cédula o pasaporte del representante legal',
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
  clave_firma: string;

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
    description:
      'PDF del SRI / RUC en Base64 (se envía como pdfSriBase64 a ENEXT y como rucFile a UANATACA)',
    example: 'JVBERi0xLjQKJeLjz9MKMSAw...',
  })
  @IsString()
  @IsNotEmpty()
  pdf_sri_base64: string;

  @ApiProperty({
    description: 'Documento de nombramiento en Base64',
    example: 'JVBERi0xLjQKJeLjz9MKMSAw...',
  })
  @IsString()
  @IsNotEmpty()
  nombramiento_base64: string;

  @ApiProperty({
    description: 'Documento de constitución en Base64',
    example: 'JVBERi0xLjQKJeLjz9MKMSAw...',
  })
  @IsString()
  @IsNotEmpty()
  constitucion_base64: string;

  @ApiProperty({
    description:
      'Documento de archivo con la aceptación del nombramiento en Base64',
    example: 'JVBERi0xLjQKJeLjz9MKMSAw...',
  })
  @IsString()
  @IsNotEmpty()
  aceptacion_nombramiento_base64: string;

  @ApiProperty({
    description:
      'Documento de la identificación del representante legal en Base64',
    example: 'JVBERi0xLjQKJeLjz9MKMSAw...',
  })
  @IsString()
  @IsNotEmpty()
  identificacion_representante_base64: string;

  @ApiProperty({
    description: 'ID del plan asignado al distribuidor',
    example: 'clx123abc456',
  })
  @IsString()
  @IsNotEmpty()
  plan_id: string;

  @ApiProperty({
    description: 'Fecha de nacimiento del representante en formato ISO',
    example: '1990-05-15',
  })
  @IsDateString()
  @IsNotEmpty()
  fecha_nacimiento: string;

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
  @IsString()
  @IsEnum(['true', 'false'])
  usa_token: string;
}
