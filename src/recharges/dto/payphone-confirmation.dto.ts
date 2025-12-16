import { IsInt, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayphoneConfirmationDto {
  @ApiProperty({
    description: 'ID de transacción de Payphone',
    example: 23178284,
  })
  @IsInt()
  @IsNotEmpty()
  id: number;

  @ApiProperty({
    description: 'ID de transacción del cliente (rechargeId)',
    example: 'clxyz123abc',
  })
  @IsString()
  @IsNotEmpty()
  clientTxId: string;
}
