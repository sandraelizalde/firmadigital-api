import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';

export class DeductBalanceDto {
  @ApiProperty({
    description: 'Monto a descontar en centavos',
    example: 5000,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @ApiProperty({
    description: 'Nota o motivo del descuento',
    example: 'Ajuste por error en facturación',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;
}
