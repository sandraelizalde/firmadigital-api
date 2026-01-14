import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCreditDto {
  @ApiProperty({
    description: 'ID del distribuidor al que se le asignará el crédito',
    example: 'clx123456789',
  })
  @IsString()
  @IsNotEmpty()
  distributorId: string;

  @ApiProperty({
    description:
      'Fecha de vencimiento del crédito. Puede enviarse solo la fecha (2026-02-14)',
    example: '2026-02-14',
    type: String,
  })
  @IsNotEmpty()
  @Type(() => Date)
  dueDate: Date;
}
