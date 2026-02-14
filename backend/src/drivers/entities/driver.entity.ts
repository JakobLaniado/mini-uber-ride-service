import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ride } from '../../rides/entities/ride.entity';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.driver)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'vehicle_make' })
  vehicleMake: string;

  @Column({ name: 'vehicle_model' })
  vehicleModel: string;

  @Column({ name: 'vehicle_color' })
  vehicleColor: string;

  @Column({ name: 'license_plate', unique: true })
  licensePlate: string;

  @Index()
  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  @Index({ spatial: true })
  currentLocation: object | null;

  @Column({ name: 'current_lat', type: 'float', nullable: true })
  currentLat: number | null;

  @Column({ name: 'current_lng', type: 'float', nullable: true })
  currentLng: number | null;

  @Column({ type: 'float', default: 5.0 })
  rating: number;

  @Column({ name: 'total_trips', type: 'int', default: 0 })
  totalTrips: number;

  // Nullable UUID — no FK constraint to avoid circular dependency with Ride
  // Correctness enforced in transaction logic
  @Column({ name: 'active_ride_id', type: 'uuid', nullable: true })
  activeRideId: string | null;

  @UpdateDateColumn({ name: 'location_updated_at' })
  locationUpdatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Ride, (ride) => ride.driver)
  assignedRides?: Ride[];
}
