import { IsString, MinLength } from 'class-validator';

export class RegisterDriverDto {
  @IsString()
  @MinLength(1)
  vehicleMake: string;

  @IsString()
  @MinLength(1)
  vehicleModel: string;

  @IsString()
  @MinLength(1)
  vehicleColor: string;

  @IsString()
  @MinLength(1)
  licensePlate: string;
}
