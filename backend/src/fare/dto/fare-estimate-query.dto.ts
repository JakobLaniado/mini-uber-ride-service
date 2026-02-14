import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class FareEstimateQueryDto {
  @ApiProperty({ example: 40.7484 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat: number;

  @ApiProperty({ example: -73.9857 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng: number;

  @ApiProperty({ example: 40.6413 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat: number;

  @ApiProperty({ example: -73.7781 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  destLng: number;
}
