import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride } from '../rides/entities/ride.entity';
import { RideStatus } from '../common/enums';

export interface EarningsSummary {
  totalRides: number;
  totalEarnings: number;
  averageFare: number;
  totalDistanceKm: number;
  totalMinutes: number;
}

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
  ) {}

  /** Rider's past rides (all statuses), paginated */
  async getRiderHistory(
    riderId: string,
    page: number,
    limit: number,
  ): Promise<{ rides: Ride[]; total: number }> {
    const [rides, total] = await this.rideRepo.findAndCount({
      where: { riderId },
      relations: ['driver', 'driver.user'],
      order: { requestedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { rides, total };
  }

  /** Driver's completed rides, paginated */
  async getDriverHistory(
    driverId: string,
    page: number,
    limit: number,
  ): Promise<{ rides: Ride[]; total: number }> {
    const [rides, total] = await this.rideRepo.findAndCount({
      where: { driverId, status: RideStatus.COMPLETED },
      order: { completedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { rides, total };
  }

  /** Driver earnings summary within an optional date range */
  async getDriverEarnings(
    driverId: string,
    from?: string,
    to?: string,
  ): Promise<EarningsSummary> {
    const qb = this.rideRepo
      .createQueryBuilder('ride')
      .where('ride.driver_id = :driverId', { driverId })
      .andWhere('ride.status = :status', { status: RideStatus.COMPLETED });

    if (from) {
      qb.andWhere('ride.completed_at >= :from', { from });
    }
    if (to) {
      qb.andWhere('ride.completed_at <= :to', { to });
    }

    const result = await qb
      .select('COUNT(*)::int', 'totalRides')
      .addSelect('COALESCE(SUM(ride.final_fare), 0)::float', 'totalEarnings')
      .addSelect(
        'COALESCE(AVG(ride.final_fare), 0)::float',
        'averageFare',
      )
      .addSelect(
        'COALESCE(SUM(ride.distance_km), 0)::float',
        'totalDistanceKm',
      )
      .addSelect(
        'COALESCE(SUM(ride.duration_minutes), 0)::int',
        'totalMinutes',
      )
      .getRawOne();

    return {
      totalRides: result?.totalRides ?? 0,
      totalEarnings: round(result?.totalEarnings ?? 0),
      averageFare: round(result?.averageFare ?? 0),
      totalDistanceKm: round(result?.totalDistanceKm ?? 0),
      totalMinutes: result?.totalMinutes ?? 0,
    };
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
