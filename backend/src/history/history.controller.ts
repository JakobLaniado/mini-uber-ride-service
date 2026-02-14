import {
  Controller,
  Get,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { HistoryService } from './history.service';
import { DriversService } from '../drivers/drivers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import type { AuthUser } from '../common/interfaces/authenticated-request.interface';
import { PaginationDto } from '../common/dto/pagination.dto';
import { EarningsQueryDto } from './dto/earnings-query.dto';

@ApiTags('history')
@ApiBearerAuth('jwt')
@Controller('history')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly driversService: DriversService,
  ) {}

  /** Rider's past rides (paginated) */
  @Get('rides')
  @Roles(Role.RIDER)
  @ApiOperation({ summary: 'Get rider past rides (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated ride history' })
  async getRiderHistory(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationDto,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const { rides, total } = await this.historyService.getRiderHistory(
      user.id,
      page,
      limit,
    );

    return {
      rides,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Driver's completed rides (paginated) */
  @Get('driver/rides')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get driver completed rides (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated ride history' })
  async getDriverHistory(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationDto,
  ) {
    const driver = await this.driversService.findByUserId(user.id);
    if (!driver) throw new NotFoundException('Driver profile not found');

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const { rides, total } = await this.historyService.getDriverHistory(
      driver.id,
      page,
      limit,
    );

    return {
      rides,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Driver earnings summary (with optional date range) */
  @Get('driver/earnings')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get driver earnings summary' })
  @ApiResponse({ status: 200, description: 'Earnings summary' })
  async getDriverEarnings(
    @CurrentUser() user: AuthUser,
    @Query() query: EarningsQueryDto,
  ) {
    const driver = await this.driversService.findByUserId(user.id);
    if (!driver) throw new NotFoundException('Driver profile not found');

    return this.historyService.getDriverEarnings(
      driver.id,
      query.from,
      query.to,
    );
  }
}
