import { IsEnum } from 'class-validator';
import { RideStatus } from '../../common/enums';

export class UpdateRideStatusDto {
  @IsEnum(RideStatus)
  status: RideStatus;
}
