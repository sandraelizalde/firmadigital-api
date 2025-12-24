import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  Matches,
  Length,
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
    description: 'URL de la foto frontal de cédula del representante',
    example: 'https://example.com/frontal.jpg',
  })
  @IsString()
  @IsNotEmpty()
  foto_frontal: string;

  @ApiProperty({
    description: 'URL de la foto posterior de cédula del representante',
    example: 'https://example.com/posterior.jpg',
  })
  @IsString()
  @IsNotEmpty()
  foto_posterior: string;

  @ApiProperty({
    description: 'URL del documento de nombramiento',
    example: 'https://example.com/nombramiento.pdf',
  })
  @IsString()
  @IsNotEmpty()
  nombramiento: string;

  @ApiProperty({
    description: 'Perfil de firma (PJ-003, PJ-006, etc.)',
    example: 'PJ-003',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^PJ-\d{3}$/, {
    message: 'El perfil debe tener formato PJ-XXX (ej: PJ-003)',
  })
  perfil_firma: string;

  @ApiProperty({
    description: 'Fecha de nacimiento del representante en formato ISO',
    example: '1990-05-15',
  })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;
}
