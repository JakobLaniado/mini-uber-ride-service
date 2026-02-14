import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SurgeZone } from './entities/surge-zone.entity';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, VERSION_KEYS } from '../cache/cache-keys';
import { haversineDistanceKm } from '../common/utils/geo';

const BASE_FARE = 2.5;
const PER_KM_RATE = 1.5;
const PER_MINUTE_RATE = 0.25;
const MINIMUM_FARE = 5.0;

export interface FareBreakdown {
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  surgeMultiplier: number;
  surgeName: string | null;
  total: number;
}

@Injectable()
export class FareService {
  constructor(
    @InjectRepository(SurgeZone)
    private readonly surgeZoneRepo: Repository<SurgeZone>,
    private readonly cache: CacheService,
  ) {}

  calculateFare(
    distanceKm: number,
    durationMinutes: number,
    surgeMultiplier: number,
  ): FareBreakdown {
    const distanceCharge = distanceKm * PER_KM_RATE;
    const timeCharge = durationMinutes * PER_MINUTE_RATE;
    const subtotal = BASE_FARE + distanceCharge + timeCharge;
    const total = Math.max(subtotal * surgeMultiplier, MINIMUM_FARE);

    return {
      baseFare: BASE_FARE,
      distanceCharge: round(distanceCharge),
      timeCharge: round(timeCharge),
      surgeMultiplier,
      surgeName: null,
      total: round(total),
    };
  }

  async getSurgeMultiplier(
    lat: number,
    lng: number,
  ): Promise<{ multiplier: number; zoneName: string | null }> {
    const ver = await this.cache.getVersion(VERSION_KEYS.SURGE);
    const key = CacheKeys.surgeMultiplier(ver, lat, lng);
    const cached = await this.cache.get<{ multiplier: number; zoneName: string | null }>(key);
    if (cached) return cached;

    const zone = await this.surgeZoneRepo
      .createQueryBuilder('zone')
      .where('zone.is_active = :active', { active: true })
      .andWhere(
        `ST_DWithin(
          zone.center,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          zone.radius_km * 1000
        )`,
        { lat, lng },
      )
      .orderBy(
        `ST_Distance(
          zone.center,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'ASC',
      )
      .setParameters({ lat, lng })
      .getOne();

    const result = {
      multiplier: zone?.multiplier ?? 1.0,
      zoneName: zone?.name ?? null,
    };

    await this.cache.set(key, result, 300); // 5 min TTL
    return result;
  }

  async estimateFare(
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number,
  ): Promise<FareBreakdown & { distanceKm: number; estimatedMinutes: number }> {
    const ver = await this.cache.getVersion(VERSION_KEYS.FARE);
    const key = CacheKeys.fareEstimate(ver, pickupLat, pickupLng, destLat, destLng);
    const cached = await this.cache.get<FareBreakdown & { distanceKm: number; estimatedMinutes: number }>(key);
    if (cached) return cached;

    const distanceKm = haversineDistanceKm(
      pickupLat,
      pickupLng,
      destLat,
      destLng,
    );
    // Rough estimate: 30 km/h average city speed
    const estimatedMinutes = Math.ceil((distanceKm / 30) * 60);

    const surge = await this.getSurgeMultiplier(pickupLat, pickupLng);
    const fare = this.calculateFare(
      distanceKm,
      estimatedMinutes,
      surge.multiplier,
    );

    const result = {
      ...fare,
      surgeName: surge.zoneName,
      distanceKm: round(distanceKm),
      estimatedMinutes,
    };

    await this.cache.set(key, result, 600); // 10 min TTL
    return result;
  }

  // Surge zone CRUD
  async findAllSurgeZones(): Promise<SurgeZone[]> {
    return this.surgeZoneRepo.find({ order: { name: 'ASC' } });
  }

  async createSurgeZone(params: {
    name: string;
    centerLat: number;
    centerLng: number;
    radiusKm: number;
    multiplier: number;
  }): Promise<SurgeZone> {
    try {
      const result = await this.surgeZoneRepo
        .createQueryBuilder()
        .insert()
        .into(SurgeZone)
        .values({
          name: params.name,
          centerLat: params.centerLat,
          centerLng: params.centerLng,
          radiusKm: params.radiusKm,
          multiplier: params.multiplier,
          center: () =>
            `ST_SetSRID(ST_MakePoint(${params.centerLng}, ${params.centerLat}), 4326)`,
        })
        .returning('*')
        .execute();

      await this.invalidateSurgeCache();
      return result.generatedMaps[0] as SurgeZone;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === '23505'
      ) {
        throw new ConflictException(
          `Surge zone "${params.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async updateSurgeZone(
    id: string,
    params: { multiplier?: number; isActive?: boolean },
  ): Promise<void> {
    await this.surgeZoneRepo.update(id, params);
    await this.invalidateSurgeCache();
  }

  async deleteSurgeZone(id: string): Promise<void> {
    await this.surgeZoneRepo.delete(id);
    await this.invalidateSurgeCache();
  }

  private async invalidateSurgeCache(): Promise<void> {
    await this.cache.incr(VERSION_KEYS.SURGE);
    await this.cache.incr(VERSION_KEYS.FARE);
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
