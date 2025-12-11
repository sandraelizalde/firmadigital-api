import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDistributorPlanPriceDto {
  @ApiPropertyOptional({
    description: 'Nuevo precio personalizado',
    example: 15.99,
    type: Number,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number;

  @ApiPropertyOptional({
    description: 'Nuevo precio promocional personalizado',
    example: 12.99,
    type: Number,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  customPricePromo?: number;
}
