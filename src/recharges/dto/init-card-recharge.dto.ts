import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitCardRechargeDto {
  @ApiProperty({
    description:
      'Monto solicitado para la recarga en centavos (ej: 10000 = $100.00)',
    example: 10000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  requestedAmount: number;

  @ApiProperty({
    description: 'Referencia o motivo del pago',
    example: 'Recarga de saldo',
    required: false,
  })
  @IsOptional()
  @IsString()
  reference?: string;
}
