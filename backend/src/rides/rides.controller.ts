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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
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

@ApiTags('rides')
@ApiBearerAuth('jwt')
@Controller('rides')
@UseGuards(JwtAuthGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  /** Create a ride in REQUESTED state (resolves destination via LLM) */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.RIDER)
  @ApiOperation({ summary: 'Request a new ride (AI resolves destination)' })
  @ApiResponse({ status: 201, description: 'Ride created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  createRide(@CurrentUser() user: AuthUser, @Body() dto: CreateRideDto) {
    return this.ridesService.createRide(user.id, dto);
  }

  /** Dispatch: find nearby drivers -> AI selects best -> MATCHED */
  @Post(':id/match')
  @UseGuards(RolesGuard)
  @Roles(Role.RIDER)
  @ApiOperation({ summary: 'Dispatch AI to match rider with best driver' })
  @ApiResponse({ status: 201, description: 'Driver matched' })
  @ApiResponse({ status: 422, description: 'No drivers available' })
  matchRide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ridesService.matchRide(id, user.id);
  }

  /** Get ride details (rider or assigned driver only) */
  @Get(':id')
  @ApiOperation({ summary: 'Get ride details' })
  @ApiResponse({ status: 200, description: 'Ride details' })
  @ApiResponse({ status: 404, description: 'Ride not found' })
  getRide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ridesService.getRide(id, user);
  }

  /** Driver advances ride: matched -> driver_arriving -> in_progress -> completed */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Driver advances ride status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
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
  @ApiOperation({ summary: 'Change destination mid-ride (AI resolves)' })
  @ApiResponse({ status: 200, description: 'Destination updated' })
  changeDestination(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeDestinationDto,
  ) {
    return this.ridesService.changeDestination(
      id,
      user.id,
      dto.destinationText,
    );
  }

  /** Cancel ride (rider: before in_progress; driver: any time) */
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a ride' })
  @ApiResponse({ status: 201, description: 'Ride cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel' })
  cancelRide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRideDto,
  ) {
    return this.ridesService.cancelRide(id, user.id, user.role, dto.reason);
  }
}
