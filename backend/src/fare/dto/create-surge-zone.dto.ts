import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateSurgeZoneDto {
  @ApiProperty({ example: 'Manhattan Midtown' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 40.7549 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLat: number;

  @ApiProperty({ example: -73.984 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLng: number;

  @ApiProperty({ example: 3, description: 'Zone radius in km' })
  @IsNumber()
  @Min(0.1)
  radiusKm: number;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  @Min(1.0)
  @Max(10.0)
  multiplier: number;
}
