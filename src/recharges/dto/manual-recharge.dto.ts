import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManualRechargeDto {
  @ApiProperty({
    description: 'ID del distribuidor al que se asignará la recarga',
    example: 'clxxx123456',
  })
  @IsString()
  @IsNotEmpty()
  distributorId: string;

  @ApiProperty({
    description: 'Monto a acreditar en centavos (ej: 10000 = $100.00)',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Nota o comentario sobre la recarga manual (opcional)',
    example: 'Ajuste por error en sistema anterior',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
