import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RechargeStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewRechargeDto {
  @ApiProperty({
    enum: ['APPROVED', 'REJECTED'],
    description: 'Estado de revisión de la recarga',
    example: 'APPROVED',
  })
  @IsEnum(RechargeStatus)
  @IsNotEmpty()
  status: 'APPROVED' | 'REJECTED';

  @ApiProperty({
    description: 'Nota o comentario del administrador (opcional)',
    example: 'Transferencia verificada correctamente',
    required: false,
  })
  @IsOptional()
  @IsString()
  adminNote?: string;
}
