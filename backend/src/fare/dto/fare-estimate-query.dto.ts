import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class FareEstimateQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  destLng: number;
}
