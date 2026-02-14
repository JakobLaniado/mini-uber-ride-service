import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelRideDto {
  @ApiPropertyOptional({ example: 'Changed my plans' })
  @IsOptional()
  @IsString()
  reason?: string;
}
