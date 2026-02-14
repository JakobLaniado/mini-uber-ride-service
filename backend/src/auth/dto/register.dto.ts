import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/enums';

export class RegisterDto {
  @ApiProperty({ example: 'rider@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secureP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ enum: Role, example: Role.RIDER })
  @IsEnum(Role, { message: 'role must be either rider or driver' })
  role: Role;
}
