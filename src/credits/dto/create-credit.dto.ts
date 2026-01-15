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
    description: 'Cantidad de días de crédito a asignar (default: 2)',
    example: 2,
    default: 2,
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  creditDays: number = 2;
}
