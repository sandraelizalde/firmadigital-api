import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnnulSignatureDto {
  @ApiProperty({
    description: 'ID de la solicitud de firma a anular',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty({ message: 'El ID de la firma es requerido' })
  signatureId: string;

  @ApiProperty({
    description: 'Si se genera o no el movimiento de reembolso',
    example: true,
  })
  @IsNotEmpty({ message: 'El campo generateRefund es requerido' })
  generateRefund: boolean;

  @ApiPropertyOptional({
    description: 'Nota o motivo de la anulación',
    example: 'Solicitud duplicada por error del cliente',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class AnnulSignatureResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Firma anulada exitosamente y balance reembolsado' })
  message: string;

  @ApiProperty({
    example: {
      signatureId: 'clx1234567890',
      distributorId: 'clx9876543210',
      refundedAmount: 79900,
      newDistributorBalance: 529900,
      movementId: 'clx1122334455',
    },
  })
  data: {
    signatureId: string;
    distributorId: string;
    refundedAmount: number;
    newDistributorBalance: number;
    movementId: string;
  };
}
