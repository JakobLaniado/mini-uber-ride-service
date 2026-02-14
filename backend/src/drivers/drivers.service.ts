import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, VERSION_KEYS } from '../cache/cache-keys';
import { haversineDistanceKm } from '../common/utils/geo';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly cache: CacheService,
  ) {}

  async register(
    userId: string,
    params: {
      vehicleMake: string;
      vehicleModel: string;
      vehicleColor: string;
      licensePlate: string;
    },
  ): Promise<Driver> {
    const existing = await this.driverRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Driver profile already exists');
    }

    const driver = this.driverRepo.create({ userId, ...params });
    return this.driverRepo.save(driver);
  }

  async findByUserId(userId: string): Promise<Driver | null> {
    return this.driverRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async getByUserId(userId: string): Promise<Driver> {
    const driver = await this.findByUserId(userId);
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }
    return driver;
  }

  async updateStatus(userId: string, isOnline: boolean): Promise<Driver> {
    const driver = await this.getByUserId(userId);
    driver.isOnline = isOnline;
    const saved = await this.driverRepo.save(driver);
    await this.cache.incr(VERSION_KEYS.NEARBY);
    return saved;
  }

  async updateLocation(
    userId: string,
    lat: number,
    lng: number,
  ): Promise<Driver> {
    const driver = await this.getByUserId(userId);

    const timeSinceLastUpdate = Date.now() - driver.locationUpdatedAt.getTime();
    const distanceMoved =
      driver.currentLat != null
        ? haversineDistanceKm(driver.currentLat, driver.currentLng!, lat, lng) *
          1000 // meters
        : Infinity;

    if (timeSinceLastUpdate > 2000 || distanceMoved > 50) {
      // Parameterized raw query — avoids SQL injection and explicitly
      // updates location_updated_at (QueryBuilder.update() skips
      // @UpdateDateColumn since it only fires on TypeORM .save())
      await this.driverRepo.query(
        `UPDATE drivers
         SET current_lat = $1,
             current_lng = $2,
             "currentLocation" = ST_SetSRID(ST_MakePoint($3, $4), 4326),
             location_updated_at = NOW()
         WHERE id = $5`,
        [lat, lng, lng, lat, driver.id],
      );

      await this.cache.incr(VERSION_KEYS.NEARBY);
    }

    driver.currentLat = lat;
    driver.currentLng = lng;
    return driver;
  }

  async findNearbyOnline(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<(Driver & { distanceKm: number })[]> {
    const ver = await this.cache.getVersion(VERSION_KEYS.NEARBY);
    const key = CacheKeys.nearbyDrivers(ver, lat, lng, radiusKm);
    const cached =
      await this.cache.get<(Driver & { distanceKm: number })[]>(key);
    if (cached) return cached;

    const radiusMeters = radiusKm * 1000;

    const drivers = await this.driverRepo
      .createQueryBuilder('driver')
      .innerJoinAndSelect('driver.user', 'user')
      .addSelect(
        `ST_Distance(
          driver."currentLocation",
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        ) / 1000`,
        'distance_km',
      )
      .where('driver.is_online = :isOnline', { isOnline: true })
      .andWhere('driver.active_ride_id IS NULL')
      .andWhere(
        `ST_DWithin(
          driver."currentLocation",
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
      )
      .orderBy('distance_km', 'ASC')
      .setParameters({ lat, lng, radius: radiusMeters })
      .getRawAndEntities();

    const raw = drivers.raw as { distance_km?: string }[];
    const result = drivers.entities.map((driver, i) => ({
      ...driver,
      distanceKm: parseFloat(raw[i]?.distance_km ?? '0'),
    }));

    await this.cache.set(key, result, 15); // 15s TTL
    return result;
  }
}
