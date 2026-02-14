import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSurgeZoneDto {
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(10.0)
  multiplier?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
