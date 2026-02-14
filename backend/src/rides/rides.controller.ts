import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RidesService } from './rides.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import type { AuthUser } from '../common/interfaces/authenticated-request.interface';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideStatusDto } from './dto/update-ride-status.dto';
import { ChangeDestinationDto } from './dto/change-destination.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';

@Controller('rides')
@UseGuards(JwtAuthGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  /** Create a ride in REQUESTED state (resolves destination via LLM) */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.RIDER)
  createRide(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRideDto,
  ) {
    return this.ridesService.createRide(user.id, dto);
  }

  /** Dispatch: find nearby drivers → AI selects best → MATCHED */
  @Post(':id/match')
  @UseGuards(RolesGuard)
  @Roles(Role.RIDER)
  matchRide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ridesService.matchRide(id, user.id);
  }

  /** Get ride details (rider or assigned driver only) */
  @Get(':id')
  getRide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ridesService.getRide(id, user);
  }

  /** Driver advances ride: matched → driver_arriving → in_progress → completed */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRideStatusDto,
  ) {
    return this.ridesService.updateStatus(id, user.id, dto.status);
  }

  /** Change destination mid-ride (allowed in DRIVER_ARRIVING / IN_PROGRESS) */
  @Patch(':id/destination')
  @UseGuards(RolesGuard)
  @Roles(Role.RIDER)
  changeDestination(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeDestinationDto,
  ) {
    return this.ridesService.changeDestination(id, user.id, dto.destinationText);
  }

  /** Cancel ride (rider: before in_progress; driver: any time) */
  @Post(':id/cancel')
  cancelRide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRideDto,
  ) {
    return this.ridesService.cancelRide(id, user.id, user.role, dto.reason);
  }
}
