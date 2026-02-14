import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ example: true, description: 'Set driver online or offline' })
  @IsBoolean()
  isOnline: boolean;
}
