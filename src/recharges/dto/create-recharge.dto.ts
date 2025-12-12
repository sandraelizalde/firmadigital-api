import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RechargeMethod } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRechargeDto {
  @ApiProperty({
    enum: RechargeMethod,
    description: 'Método de recarga',
    example: 'TRANSFER',
    enumName: 'RechargeMethod',
  })
  @IsEnum(RechargeMethod)
  @IsNotEmpty()
  method: RechargeMethod;

  @ApiProperty({
    description:
      'Monto solicitado para la recarga en centavos (ej: 10000 = $100.00)',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  requestedAmount: number;

  @ApiProperty({
    description: 'Referencia de pago de la transferencia (opcional)',
    example: 'TRANS-12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiProperty({
    description: 'Fecha de la transferencia (opcional)',
    example: '2025-12-12T10:00:00Z',
    required: false,
    type: Date,
  })
  @IsOptional()
  transferDate?: Date;

  @ApiProperty({
    description: 'Archivo en Base64 (opcional)',
    example: 'JVBERi0xLjQKJcTl8uXr... (base64)',
    required: false,
  })
  @IsOptional()
  @IsString()
  receiptFile?: string;
}
