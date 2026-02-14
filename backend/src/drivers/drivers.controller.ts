import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
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

@ApiTags('drivers')
@ApiBearerAuth('jwt')
@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post('register')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Register driver profile' })
  @ApiResponse({ status: 201, description: 'Driver registered' })
  @ApiResponse({ status: 409, description: 'Already registered' })
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDriverDto) {
    return this.driversService.register(user.id, dto);
  }

  @Patch('me/status')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Go online or offline' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(@CurrentUser() user: AuthUser, @Body() dto: UpdateStatusDto) {
    return this.driversService.updateStatus(user.id, dto.isOnline);
  }

  @Patch('me/location')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Update current location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  updateLocation(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.driversService.updateLocation(user.id, dto.lat, dto.lng);
  }

  @Get('me')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get own driver profile' })
  @ApiResponse({ status: 200, description: 'Driver profile' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.driversService.getByUserId(user.id);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby online drivers' })
  @ApiResponse({ status: 200, description: 'List of nearby drivers' })
  findNearby(@Query() query: NearbyDriversQueryDto) {
    return this.driversService.findNearbyOnline(
      query.lat,
      query.lng,
      query.radiusKm ?? 5,
    );
  }
}
