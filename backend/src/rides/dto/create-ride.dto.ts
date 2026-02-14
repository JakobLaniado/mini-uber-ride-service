import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateRideDto {
  @IsNumber()
  pickupLat: number;

  @IsNumber()
  pickupLng: number;

  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @IsString()
  destinationText: string;
}
