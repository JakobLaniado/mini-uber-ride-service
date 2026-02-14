import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Role } from '../../common/enums';
import { Driver } from '../../drivers/entities/driver.entity';
import { Ride } from '../../rides/entities/ride.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: Role, default: Role.RIDER })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Driver, (driver) => driver.user)
  driver?: Driver;

  @OneToMany(() => Ride, (ride) => ride.rider)
  rides?: Ride[];
}
