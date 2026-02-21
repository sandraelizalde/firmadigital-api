import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class TokenInfoDto {
  @ApiProperty({
    description:
      'UUID del tipo de envío. ' +
      'Retiro en oficina (Quito, Guayaquil, Manta): 591b23e8-db22-485e-884f-0ec8ca1e5b52 | ' +
      'Envío Ecuador continental: 1ca5c108-cb25-4c52-85b5-0d4e8202b1be | ' +
      'Envío Galápagos: afb41ea2-c6d1-4130-916a-fa9a3417eab7',
    example: '591b23e8-db22-485e-884f-0ec8ca1e5b52',
  })
  @IsString()
  @IsNotEmpty()
  shippingTypeUuid: string;

  @ApiProperty({
    description:
      'Método de entrega. PICKUP = retiro en oficina, DELIVERY = envío a domicilio',
    enum: ['PICKUP', 'DELIVERY'],
    example: 'PICKUP',
  })
  @IsEnum(['PICKUP', 'DELIVERY'])
  @IsNotEmpty()
  deliveryMethod: 'PICKUP' | 'DELIVERY';

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

  // ===== Solo para PICKUP =====

  @ApiProperty({
    description:
      'Nombre de la oficina para retiro (requerido cuando deliveryMethod = PICKUP). ' +
      'Valores posibles: QUITO, GUAYAQUIL, MANTA',
    example: 'QUITO',
    required: false,
  })
  @IsOptional()
  @IsString()
  office?: string;

  // ===== Solo para DELIVERY =====

  @ApiProperty({
    description: 'Provincia de envío (requerido cuando deliveryMethod = DELIVERY)',
    example: 'PICHINCHA',
    required: false,
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({
    description: 'Ciudad de envío (requerido cuando deliveryMethod = DELIVERY)',
    example: 'QUITO',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'Calle principal (requerido cuando deliveryMethod = DELIVERY)',
    example: 'AV. AMAZONAS',
    required: false,
  })
  @IsOptional()
  @IsString()
  mainStreet?: string;

  @ApiProperty({
    description: 'Número de casa/edificio (requerido cuando deliveryMethod = DELIVERY)',
    example: 'N34-56',
    required: false,
  })
  @IsOptional()
  @IsString()
  houseNumber?: string;

  @ApiProperty({
    description: 'Calle secundaria / intersección (opcional para DELIVERY)',
    example: 'Y COLÓN',
    required: false,
  })
  @IsOptional()
  @IsString()
  secondaryStreet?: string;

  @ApiProperty({
    description: 'Referencia de ubicación (opcional para DELIVERY)',
    example: 'EDIFICIO AZUL, PISO 3',
    required: false,
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({
    description:
      'Número de identificación del receptor (requerido cuando deliveryMethod = DELIVERY)',
    example: '1104689321',
    required: false,
  })
  @IsOptional()
  @IsString()
  recipientIdentification?: string;

  @ApiProperty({
    description: 'Nombre completo del receptor (requerido cuando deliveryMethod = DELIVERY)',
    example: 'MARIO ANDRÉS LOZANO SALAZAR',
    required: false,
  })
  @IsOptional()
  @IsString()
  recipientName?: string;
}
