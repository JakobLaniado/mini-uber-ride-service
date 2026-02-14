import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'rider@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secureP@ss1' })
  @IsString()
  password: string;
}
