import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from '../rides/entities/ride.entity';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ride]), DriversModule],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
