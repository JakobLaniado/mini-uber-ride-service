import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RideStatus } from '../../common/enums';

export class UpdateRideStatusDto {
  @ApiProperty({
    enum: RideStatus,
    example: RideStatus.DRIVER_ARRIVING,
    description: 'Target ride status',
  })
  @IsEnum(RideStatus)
  status: RideStatus;
}
