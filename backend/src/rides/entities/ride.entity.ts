import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { RideStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Driver } from '../../drivers/entities/driver.entity';
import { RideEvent } from './ride-event.entity';

@Entity('rides')
@Index(['riderId', 'requestedAt'])
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.rides)
  @JoinColumn({ name: 'rider_id' })
  rider: User;

  @Index()
  @Column({ name: 'rider_id' })
  riderId: string;

  @ManyToOne(() => Driver, (driver) => driver.assignedRides, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver?: Driver;

  @Index()
  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId: string | null;

  @Index()
  @Column({ type: 'enum', enum: RideStatus, default: RideStatus.REQUESTED })
  status: RideStatus;

  // Pickup
  @Column({ name: 'pickup_lat', type: 'float' })
  pickupLat: number;

  @Column({ name: 'pickup_lng', type: 'float' })
  pickupLng: number;

  @Column({ name: 'pickup_address', type: 'varchar', nullable: true })
  pickupAddress: string | null;

  // Destination (resolved by LLM)
  @Column({ name: 'destination_lat', type: 'float', nullable: true })
  destinationLat: number | null;

  @Column({ name: 'destination_lng', type: 'float', nullable: true })
  destinationLng: number | null;

  @Column({ name: 'destination_text' })
  destinationText: string;

  @Column({ name: 'destination_address', type: 'varchar', nullable: true })
  destinationAddress: string | null;

  // Fare
  @Column({
    name: 'estimated_fare',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  estimatedFare: number | null;

  @Column({
    name: 'final_fare',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  finalFare: number | null;

  @Column({ name: 'surge_multiplier', type: 'float', default: 1.0 })
  surgeMultiplier: number;

  @Column({ name: 'distance_km', type: 'float', nullable: true })
  distanceKm: number | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  // LLM dispatch
  @Column({ name: 'dispatch_reasoning', type: 'text', nullable: true })
  dispatchReasoning: string | null;

  // Timestamps
  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @Column({ name: 'matched_at', type: 'timestamp', nullable: true })
  matchedAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @OneToMany(() => RideEvent, (event) => event.ride)
  events?: RideEvent[];
}
