import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from './entities/ride.entity';
import { RideEvent } from './entities/ride-event.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { DriversModule } from '../drivers/drivers.module';
import { FareModule } from '../fare/fare.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, RideEvent, Driver]),
    DriversModule,
    FareModule,
    AiModule,
  ],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
