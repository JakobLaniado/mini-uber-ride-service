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
import { FareService } from './fare.service';
import { CreateSurgeZoneDto } from './dto/create-surge-zone.dto';
import { UpdateSurgeZoneDto } from './dto/update-surge-zone.dto';
import { FareEstimateQueryDto } from './dto/fare-estimate-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@Controller('fare')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FareController {
  constructor(private readonly fareService: FareService) {}

  @Get('estimate')
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
  listSurgeZones() {
    return this.fareService.findAllSurgeZones();
  }

  @Post('surge-zones')
  @Roles(Role.ADMIN)
  createSurgeZone(@Body() dto: CreateSurgeZoneDto) {
    return this.fareService.createSurgeZone(dto);
  }

  @Patch('surge-zones/:id')
  @Roles(Role.ADMIN)
  updateSurgeZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSurgeZoneDto,
  ) {
    return this.fareService.updateSurgeZone(id, dto);
  }

  @Delete('surge-zones/:id')
  @Roles(Role.ADMIN)
  deleteSurgeZone(@Param('id', ParseUUIDPipe) id: string) {
    return this.fareService.deleteSurgeZone(id);
  }
}
