import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { NearbyDriversQueryDto } from './dto/nearby-drivers-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import type { AuthUser } from '../common/interfaces/authenticated-request.interface';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post('register')
  @Roles(Role.DRIVER)
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDriverDto) {
    return this.driversService.register(user.id, dto);
  }

  @Patch('me/status')
  @Roles(Role.DRIVER)
  updateStatus(@CurrentUser() user: AuthUser, @Body() dto: UpdateStatusDto) {
    return this.driversService.updateStatus(user.id, dto.isOnline);
  }

  @Patch('me/location')
  @Roles(Role.DRIVER)
  updateLocation(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.driversService.updateLocation(user.id, dto.lat, dto.lng);
  }

  @Get('me')
  @Roles(Role.DRIVER)
  getProfile(@CurrentUser() user: AuthUser) {
    return this.driversService.getByUserId(user.id);
  }

  @Get('nearby')
  findNearby(@Query() query: NearbyDriversQueryDto) {
    return this.driversService.findNearbyOnline(
      query.lat,
      query.lng,
      query.radiusKm ?? 5,
    );
  }
}
