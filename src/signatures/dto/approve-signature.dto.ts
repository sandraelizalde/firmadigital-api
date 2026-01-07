import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveSignatureDto {
  @ApiProperty({
    description: 'ID de la solicitud de firma jurídica a aprobar',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty({ message: 'El ID de la firma es requerido' })
  signatureId: string;

  @ApiPropertyOptional({
    description: 'Nota o comentario sobre la aprobación',
    example: 'Documentación verificada correctamente',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ApproveSignatureResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Firma jurídica aprobada exitosamente' })
  message: string;

  @ApiProperty({
    example: {
      signatureId: 'clx1234567890',
      previousStatus: 'PENDING',
      newStatus: 'COMPLETED',
    },
  })
  data: {
    signatureId: string;
    previousStatus: string;
    newStatus: string;
  };
}
