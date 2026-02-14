import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('surge_zones')
export class SurgeZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  @Index({ spatial: true })
  center: object;

  @Column({ name: 'center_lat', type: 'float' })
  centerLat: number;

  @Column({ name: 'center_lng', type: 'float' })
  centerLng: number;

  @Column({ name: 'radius_km', type: 'float' })
  radiusKm: number;

  @Column({ type: 'float', default: 1.0 })
  multiplier: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
