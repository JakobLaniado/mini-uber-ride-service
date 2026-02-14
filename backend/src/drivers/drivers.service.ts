import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
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
    return this.driverRepo.save(driver);
  }

  async updateLocation(
    userId: string,
    lat: number,
    lng: number,
  ): Promise<Driver> {
    const driver = await this.getByUserId(userId);

    await this.driverRepo
      .createQueryBuilder()
      .update(Driver)
      .set({
        currentLat: lat,
        currentLng: lng,
        currentLocation: () =>
          `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`,
      })
      .where('id = :id', { id: driver.id })
      .execute();

    driver.currentLat = lat;
    driver.currentLng = lng;
    return driver;
  }

  async findNearbyOnline(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<(Driver & { distanceKm: number })[]> {
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

    return drivers.entities.map((driver, i) => ({
      ...driver,
      distanceKm: parseFloat(drivers.raw[i]?.distance_km ?? '0'),
    }));
  }
}
