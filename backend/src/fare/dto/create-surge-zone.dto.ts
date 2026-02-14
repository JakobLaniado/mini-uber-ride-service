import { IsNumber, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateSurgeZoneDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLng: number;

  @IsNumber()
  @Min(0.1)
  radiusKm: number;

  @IsNumber()
  @Min(1.0)
  @Max(10.0)
  multiplier: number;
}
