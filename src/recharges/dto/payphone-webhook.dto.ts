import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayphoneWebhookDto {
  @ApiProperty({
    description: 'ID de transacción de Payphone',
    example: 'PAY-12345678',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({
    description: 'ID de la recarga en nuestro sistema',
    example: 'clxxx123456',
  })
  @IsString()
  @IsNotEmpty()
  clientTransactionId: string;

  @ApiProperty({
    description: 'Estado de la transacción',
    example: 'Approved',
    enum: ['Approved', 'Rejected', 'Pending', 'Failed'],
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    description: 'Monto de la transacción en centavos',
    example: 10000,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Código de autorización de la transacción (opcional)',
    example: 'AUTH-123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @ApiProperty({
    description: 'Mensaje adicional de Payphone (opcional)',
    example: 'Transacción procesada exitosamente',
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string;
}
