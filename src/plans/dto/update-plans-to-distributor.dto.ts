import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdatePlanPriceDto {
  @ApiProperty({
    description: 'ID del plan',
    example: 'clxxxxx',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  planId: string;

  @ApiProperty({
    description: 'Precio personalizado para este distribuidor',
    example: 1299,
    type: Number,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  customPrice: number;
}

export class UpdatePlansToDistributorDto {
  @ApiProperty({
    description: 'ID del distribuidor',
    example: 'clxxxxx',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  distributorId: string;

  @ApiProperty({
    description: 'Array de planes con sus precios personalizados a actualizar',
    type: [UpdatePlanPriceDto],
    example: [
      {
        planId: 'clxxxxx1',
        customPrice: 1299,
      },
      {
        planId: 'clxxxxx2',
        customPrice: 1599,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePlanPriceDto)
  plans: UpdatePlanPriceDto[];
}
