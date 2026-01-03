import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDate,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class PlanDataDto {
  @ApiProperty({
    description: 'Nombre del perfil del plan',
    example: 'FIRMA ELECTRÓNICA FACTURACIÓN EMPRESA - 1 AÑO',
  })
  @IsString()
  perfil: string;

  @ApiProperty({
    description: 'Precio personalizado en centavos',
    example: 10000,
  })
  @IsNumber()
  customPrice: number;

  @ApiProperty({
    description: 'Duración del plan',
    example: '1',
  })
  @IsString()
  duration: string;

  @ApiProperty({
    description: 'Tipo de duración (D, M, MS, Y, YS)',
    example: 'Y',
  })
  @IsString()
  durationType: string;
}

export class TestContractDto {
  @ApiProperty({
    description: 'Nombre del distribuidor o razón social',
    example: 'DISTRIBUIDORA EJEMPLO S.A.',
  })
  @IsString()
  distributorName: string;

  @ApiProperty({
    description: 'RUC o cédula del distribuidor',
    example: '1234567890001',
  })
  @IsString()
  identification: string;

  @ApiProperty({
    description: 'Email del distribuidor',
    example: 'distribuidor@ejemplo.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Teléfono del distribuidor',
    example: '+593 99 123 4567',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Dirección del distribuidor',
    example: 'Av. Principal 123 y Secundaria, Edificio Ejemplo, Piso 5',
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Ciudad del distribuidor',
    example: 'Quito',
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'Nombre del representante legal',
    example: 'Juan Pérez García',
  })
  @IsString()
  representativeName: string;

  @ApiProperty({
    description: 'Cédula del representante legal',
    example: '1234567890',
  })
  @IsString()
  representativeId: string;

  @ApiProperty({
    description: 'Lista de planes jurídicos asignados',
    type: [PlanDataDto],
    example: [
      {
        perfil: 'FIRMA ELECTRÓNICA FACTURACIÓN EMPRESA - 1 AÑO',
        customPrice: 10000,
        duration: 1,
        durationType: 'Y',
      },
      {
        perfil: 'FIRMA ELECTRÓNICA FACTURACIÓN EMPRESA - 2 AÑOS',
        customPrice: 18000,
        duration: 2,
        durationType: 'YS',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDataDto)
  plans: PlanDataDto[];

  @ApiProperty({
    description: 'Fecha del contrato (opcional, por defecto fecha actual)',
    example: '2024-01-15',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;
}
