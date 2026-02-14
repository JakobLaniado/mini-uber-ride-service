import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RideStatus } from '../../common/enums';
import { Ride } from './ride.entity';

@Entity('ride_events')
export class RideEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ride, (ride) => ride.events)
  @JoinColumn({ name: 'ride_id' })
  ride: Ride;

  @Column({ name: 'ride_id' })
  rideId: string;

  @Column({ name: 'from_status', type: 'enum', enum: RideStatus })
  fromStatus: RideStatus;

  @Column({ name: 'to_status', type: 'enum', enum: RideStatus })
  toStatus: RideStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  timestamp: Date;
}
