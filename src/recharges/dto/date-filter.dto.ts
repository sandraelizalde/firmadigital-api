import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination-query.dto';

export class DateFilterDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Fecha de inicio del rango (formato ISO 8601)',
        example: '2026-01-01',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'Fecha de fin del rango (formato ISO 8601)',
        example: '2026-01-31',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}
