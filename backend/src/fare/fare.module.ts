import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurgeZone } from './entities/surge-zone.entity';
import { FareService } from './fare.service';
import { FareController } from './fare.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SurgeZone])],
  providers: [FareService],
  controllers: [FareController],
  exports: [FareService],
})
export class FareModule {}
