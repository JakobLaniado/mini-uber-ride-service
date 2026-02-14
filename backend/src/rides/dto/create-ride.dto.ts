import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateRideDto {
  @ApiProperty({ example: 40.7484, description: 'Pickup latitude' })
  @IsNumber()
  pickupLat: number;

  @ApiProperty({ example: -73.9857, description: 'Pickup longitude' })
  @IsNumber()
  pickupLng: number;

  @ApiPropertyOptional({ example: '350 5th Ave, New York, NY' })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiProperty({
    example: 'JFK Airport',
    description: 'Natural language destination resolved by AI',
  })
  @IsString()
  destinationText: string;
}
