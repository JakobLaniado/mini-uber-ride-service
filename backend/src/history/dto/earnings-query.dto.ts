import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class EarningsQueryDto {
  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Start date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'End date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
