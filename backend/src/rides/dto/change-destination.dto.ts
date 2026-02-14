import { IsString } from 'class-validator';

export class ChangeDestinationDto {
  @IsString()
  destinationText: string;
}
