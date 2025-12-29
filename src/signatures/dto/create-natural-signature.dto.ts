import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  Matches,
  Length,
  IsOptional,
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
    description: 'Número de cédula',
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
  clavefirma: string;

  @ApiProperty({
    description: 'URL de la foto frontal de cédula',
    example: 'https://example.com/frontal.jpg',
  })
  @IsString()
  @IsNotEmpty()
  foto_frontal: string;

  @ApiProperty({
    description: 'URL de la foto posterior de cédula',
    example: 'https://example.com/posterior.jpg',
  })
  @IsString()
  @IsNotEmpty()
  foto_posterior: string;

  @ApiProperty({
    description: 'Perfil de firma (PN-001, PN-002, etc.)',
    example: 'PN-001',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^PN-\d{3}$/, {
    message: 'El perfil debe tener formato PN-XXX (ej: PN-001)',
  })
  perfil_firma: string;

  @ApiProperty({
    description: 'Fecha de nacimiento en formato ISO',
    example: '1990-05-15',
  })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({
    description: 'RUC (opcional, solo si la persona natural tiene RUC)',
    example: '1752549467001',
    required: false,
  })
  @IsOptional()
  @IsString()
  ruc?: string;
}
