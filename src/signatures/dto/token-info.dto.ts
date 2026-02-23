import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum ShippingType {
  /** Retiro en oficina de Uanataca (Quito) */
  RETIRO_OFICINA = 'RETIRO_OFICINA',
  /** Envío a Ecuador Continental */
  ENVIO_ECUADOR_CONTINENTAL = 'ENVIO_ECUADOR_CONTINENTAL',
  /** Envío a Galápagos */
  ENVIO_GALAPAGOS = 'ENVIO_GALAPAGOS',
}

export class TokenInfoDto {
  @ApiProperty({
    description:
      'Tipo de envío del token físico. ' +
      'RETIRO_OFICINA = Retiro en oficina de Uanataca (Quito) | ' +
      'ENVIO_ECUADOR_CONTINENTAL = Envío a Ecuador Continental | ' +
      'ENVIO_GALAPAGOS = Envío a Galápagos',
    enum: ShippingType,
    example: ShippingType.RETIRO_OFICINA,
  })
  @IsEnum(ShippingType)
  @IsNotEmpty()
  shippingType: ShippingType;

  @ApiProperty({
    description: 'Nombre de contacto del destinatario',
    example: 'MARIO ANDRÉS LOZANO SALAZAR',
  })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({
    description: 'Teléfono de contacto del destinatario',
    example: '0984123456',
  })
  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  // ===== Solo para ENVIO_ECUADOR_CONTINENTAL y ENVIO_GALAPAGOS =====

  @ApiProperty({
    description:
      'Provincia de envío (requerido cuando shippingType = ENVIO_ECUADOR_CONTINENTAL o ENVIO_GALAPAGOS)',
    example: 'PICHINCHA',
    required: false,
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({
    description:
      'Ciudad de envío (requerido cuando shippingType = ENVIO_ECUADOR_CONTINENTAL o ENVIO_GALAPAGOS)',
    example: 'QUITO',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description:
      'Calle principal (requerido cuando shippingType = ENVIO_ECUADOR_CONTINENTAL o ENVIO_GALAPAGOS)',
    example: 'AV. AMAZONAS',
    required: false,
  })
  @IsOptional()
  @IsString()
  mainStreet?: string;

  @ApiProperty({
    description:
      'Número de casa/edificio (requerido cuando shippingType = ENVIO_ECUADOR_CONTINENTAL o ENVIO_GALAPAGOS)',
    example: 'N34-56',
    required: false,
  })
  @IsOptional()
  @IsString()
  houseNumber?: string;

  @ApiProperty({
    description:
      'Calle secundaria / intersección (opcional para envíos a domicilio)',
    example: 'Y COLÓN',
    required: false,
  })
  @IsOptional()
  @IsString()
  secondaryStreet?: string;

  @ApiProperty({
    description: 'Referencia de ubicación (opcional para envíos a domicilio)',
    example: 'EDIFICIO AZUL, PISO 3',
    required: false,
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({
    description:
      'Número de identificación del receptor (requerido cuando shippingType = ENVIO_ECUADOR_CONTINENTAL o ENVIO_GALAPAGOS)',
    example: '1104689321',
    required: false,
  })
  @IsOptional()
  @IsString()
  recipientIdentification?: string;

  @ApiProperty({
    description:
      'Nombre completo del receptor (requerido cuando shippingType = ENVIO_ECUADOR_CONTINENTAL o ENVIO_GALAPAGOS)',
    example: 'MARIO ANDRÉS LOZANO SALAZAR',
    required: false,
  })
  @IsOptional()
  @IsString()
  recipientName?: string;
}
