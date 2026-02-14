import { IsOptional, IsDateString } from 'class-validator';

export class EarningsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
