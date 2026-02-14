import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChangeDestinationDto {
  @ApiProperty({ example: 'actually, take me to the airport instead' })
  @IsString()
  destinationText: string;
}
