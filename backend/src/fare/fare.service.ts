import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SurgeZone } from './entities/surge-zone.entity';

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

    return {
      multiplier: zone?.multiplier ?? 1.0,
      zoneName: zone?.name ?? null,
    };
  }

  async estimateFare(
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number,
  ): Promise<FareBreakdown & { distanceKm: number; estimatedMinutes: number }> {
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

    return {
      ...fare,
      surgeName: surge.zoneName,
      distanceKm: round(distanceKm),
      estimatedMinutes,
    };
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

    return result.generatedMaps[0] as SurgeZone;
  }

  async updateSurgeZone(
    id: string,
    params: { multiplier?: number; isActive?: boolean },
  ): Promise<void> {
    await this.surgeZoneRepo.update(id, params);
  }

  async deleteSurgeZone(id: string): Promise<void> {
    await this.surgeZoneRepo.delete(id);
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
