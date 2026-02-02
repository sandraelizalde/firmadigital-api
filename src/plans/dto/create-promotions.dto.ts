import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DistributorPromotionDto {
  @ApiProperty({
    description: 'ID del distribuidor',
    example: 'clxxxxx',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  distributorId: string;

  @ApiProperty({
    description: 'Precio promocional personalizado',
    example: 9.99,
    type: Number,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  customPricePromo?: number;
}

export class CreatePromotionsDto {
  @ApiProperty({
    description: 'Duración del plan',
    example: '1',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  duration: string;

  @ApiProperty({
    description: 'Tipo de duración del plan',
    example: 'Y',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  durationType: string;

  @ApiProperty({
    description: 'Send notification',
    example: true,
    type: Boolean,
  })
  @IsNotEmpty()
  sendNotification: boolean;

  @ApiProperty({
    description: 'Array de distribuidores con sus precios promocionales',
    type: [DistributorPromotionDto],
    example: [
      {
        distributorId: 'clxxxxx1',
        customPricePromo: 9.99,
      },
      {
        distributorId: 'clxxxxx2',
        customPricePromo: 8.99,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DistributorPromotionDto)
  distributors: DistributorPromotionDto[];
}
