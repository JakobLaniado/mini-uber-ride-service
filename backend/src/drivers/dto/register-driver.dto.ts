import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RegisterDriverDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @MinLength(1)
  vehicleMake: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  @MinLength(1)
  vehicleModel: string;

  @ApiProperty({ example: 'White' })
  @IsString()
  @MinLength(1)
  vehicleColor: string;

  @ApiProperty({ example: 'ABC-1234' })
  @IsString()
  @MinLength(1)
  licensePlate: string;
}
