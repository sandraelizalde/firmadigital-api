import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PlanPriceDto {
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
    example: 12.99,
    type: Number,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  customPrice: number;

  @ApiPropertyOptional({
    description: 'Precio promocional personalizado (opcional)',
    example: 9.99,
    type: Number,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  customPricePromo?: number;
}

export class AssignPlansToDistributorDto {
  @ApiProperty({
    description: 'ID del distribuidor',
    example: 'clxxxxx',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  distributorId: string;

  @ApiProperty({
    description: 'Array de planes con sus precios personalizados',
    type: [PlanPriceDto],
    example: [
      {
        planId: 'clxxxxx1',
        customPrice: 12.99,
        customPricePromo: 9.99,
      },
      {
        planId: 'clxxxxx2',
        customPrice: 15.99,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanPriceDto)
  plans: PlanPriceDto[];
}
