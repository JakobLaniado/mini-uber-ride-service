import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FareService } from './fare.service';
import { CreateSurgeZoneDto } from './dto/create-surge-zone.dto';
import { UpdateSurgeZoneDto } from './dto/update-surge-zone.dto';
import { FareEstimateQueryDto } from './dto/fare-estimate-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('fare')
@ApiBearerAuth('jwt')
@Controller('fare')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FareController {
  constructor(private readonly fareService: FareService) {}

  @Get('estimate')
  @ApiOperation({ summary: 'Estimate fare between two points' })
  @ApiResponse({ status: 200, description: 'Fare estimate' })
  estimate(@Query() query: FareEstimateQueryDto) {
    return this.fareService.estimateFare(
      query.pickupLat,
      query.pickupLng,
      query.destLat,
      query.destLng,
    );
  }

  @Get('surge-zones')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all surge zones (admin)' })
  @ApiResponse({ status: 200, description: 'Surge zones list' })
  listSurgeZones() {
    return this.fareService.findAllSurgeZones();
  }

  @Post('surge-zones')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a surge zone (admin)' })
  @ApiResponse({ status: 201, description: 'Zone created' })
  @ApiResponse({ status: 409, description: 'Zone name exists' })
  createSurgeZone(@Body() dto: CreateSurgeZoneDto) {
    return this.fareService.createSurgeZone(dto);
  }

  @Patch('surge-zones/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a surge zone (admin)' })
  @ApiResponse({ status: 200, description: 'Zone updated' })
  updateSurgeZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSurgeZoneDto,
  ) {
    return this.fareService.updateSurgeZone(id, dto);
  }

  @Delete('surge-zones/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a surge zone (admin)' })
  @ApiResponse({ status: 200, description: 'Zone deleted' })
  deleteSurgeZone(@Param('id', ParseUUIDPipe) id: string) {
    return this.fareService.deleteSurgeZone(id);
  }
}
