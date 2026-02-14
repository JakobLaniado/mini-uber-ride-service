import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Ride } from './entities/ride.entity';
import { RideEvent } from './entities/ride-event.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { DriversService } from '../drivers/drivers.service';
import { FareService } from '../fare/fare.service';
import { DestinationResolverAgent } from '../ai/agents/destination-resolver.agent';
import { DispatchAgent } from '../ai/agents/dispatch.agent';
import { RideStatus, Role } from '../common/enums';
import { RideStateMachine } from '../common/constants/ride-states';
import {
  BusinessException,
  DriverUnavailableException,
} from '../common/exceptions';
import type { AuthUser } from '../common/interfaces/authenticated-request.interface';
import type { CreateRideDto } from './dto/create-ride.dto';

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    @InjectRepository(RideEvent)
    private readonly rideEventRepo: Repository<RideEvent>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly driversService: DriversService,
    private readonly fareService: FareService,
    private readonly destinationResolver: DestinationResolverAgent,
    private readonly dispatchAgent: DispatchAgent,
    private readonly dataSource: DataSource,
  ) {}

  // ─── POST /rides ───────────────────────────────────────────────
  async createRide(riderId: string, dto: CreateRideDto): Promise<Ride> {
    // Resolve natural-language destination via LLM
    const resolved = await this.destinationResolver.resolve(
      dto.destinationText,
      { lat: dto.pickupLat, lng: dto.pickupLng },
    );

    // Estimate fare
    const estimate = await this.fareService.estimateFare(
      dto.pickupLat,
      dto.pickupLng,
      resolved.lat,
      resolved.lng,
    );

    const ride = this.rideRepo.create({
      riderId,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      pickupAddress: dto.pickupAddress ?? null,
      destinationText: dto.destinationText,
      destinationLat: resolved.lat,
      destinationLng: resolved.lng,
      destinationAddress: resolved.address,
      estimatedFare: estimate.total,
      surgeMultiplier: estimate.surgeMultiplier,
      distanceKm: estimate.distanceKm,
      durationMinutes: estimate.estimatedMinutes,
      status: RideStatus.REQUESTED,
    });

    return this.rideRepo.save(ride);
  }

  // ─── POST /rides/:id/match ─────────────────────────────────────
  async matchRide(rideId: string, riderId: string): Promise<Ride> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.riderId !== riderId) {
      throw new ForbiddenException('Not your ride');
    }
    RideStateMachine.assertTransition(ride.status, RideStatus.MATCHED);

    // Find nearby online drivers (10 km default)
    const nearby = await this.driversService.findNearbyOnline(
      ride.pickupLat,
      ride.pickupLng,
      10,
    );
    if (nearby.length === 0) throw new DriverUnavailableException();

    // Build candidate list for LLM dispatch
    const candidates = nearby.map((d) => ({
      id: d.id,
      name: d.user?.name ?? 'Unknown',
      distanceKm: d.distanceKm,
      rating: d.rating,
      totalTrips: d.totalTrips,
      vehicleMake: d.vehicleMake,
      vehicleModel: d.vehicleModel,
    }));

    const decision = await this.dispatchAgent.selectBestDriver({
      ride: {
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        destinationLat: ride.destinationLat!,
        destinationLng: ride.destinationLng!,
      },
      candidates,
    });

    // Order: AI-selected driver first, then remaining by distance
    const orderedIds = [
      decision.selectedDriverId,
      ...candidates
        .filter((c) => c.id !== decision.selectedDriverId)
        .map((c) => c.id),
    ];

    // ── Transactional assignment with FOR UPDATE SKIP LOCKED ──
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Lock the ride row and re-verify status under the lock.
      // Prevents double-match when two concurrent requests both pass
      // the preliminary assertTransition check above.
      const [lockedRide] = (await qr.query(
        `SELECT status FROM rides WHERE id = $1 FOR UPDATE`,
        [rideId],
      )) as { status: string }[];
      if (!lockedRide) {
        throw new NotFoundException('Ride not found');
      }
      RideStateMachine.assertTransition(
        lockedRide.status as RideStatus,
        RideStatus.MATCHED,
      );

      let assignedDriverId: string | null = null;

      for (const driverId of orderedIds) {
        const rows = (await qr.query(
          `SELECT id FROM drivers WHERE id = $1 AND active_ride_id IS NULL FOR UPDATE SKIP LOCKED`,
          [driverId],
        )) as unknown[];
        if (rows.length > 0) {
          assignedDriverId = driverId;
          break;
        }
      }

      if (!assignedDriverId) {
        await qr.rollbackTransaction();
        throw new DriverUnavailableException();
      }

      const usedAiPick = assignedDriverId === decision.selectedDriverId;
      const reasoning = usedAiPick
        ? decision.reasoning
        : 'Fallback: AI-selected driver unavailable, assigned next closest available driver.';

      // Claim driver
      await qr.manager.update(Driver, assignedDriverId, {
        activeRideId: rideId,
      });

      // Update ride
      const now = new Date();
      await qr.manager.update(Ride, rideId, {
        driverId: assignedDriverId,
        status: RideStatus.MATCHED,
        matchedAt: now,
        dispatchReasoning: reasoning,
      });

      // Audit event
      const event = qr.manager.create(RideEvent, {
        rideId,
        fromStatus: RideStatus.REQUESTED,
        toStatus: RideStatus.MATCHED,
        metadata: {
          assignedDriverId,
          aiSelectedDriverId: decision.selectedDriverId,
          reasoning,
        },
      });
      await qr.manager.save(RideEvent, event);

      await qr.commitTransaction();

      this.logger.log(`Ride ${rideId} matched with driver ${assignedDriverId}`);

      return this.rideRepo.findOne({
        where: { id: rideId },
        relations: ['driver', 'driver.user'],
      }) as Promise<Ride>;
    } catch (error) {
      if (qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      throw error;
    } finally {
      await qr.release();
    }
  }

  // ─── GET /rides/:id ────────────────────────────────────────────
  async getRide(rideId: string, user: AuthUser): Promise<Ride> {
    const ride = await this.rideRepo.findOne({
      where: { id: rideId },
      relations: ['driver', 'driver.user', 'events'],
    });
    if (!ride) throw new NotFoundException('Ride not found');

    // Ownership: rider sees own rides, driver sees assigned rides
    if (user.role === Role.RIDER && ride.riderId !== user.id) {
      throw new ForbiddenException('Not your ride');
    }
    if (user.role === Role.DRIVER) {
      const driver = await this.driversService.findByUserId(user.id);
      if (!driver || ride.driverId !== driver.id) {
        throw new ForbiddenException('Not your assigned ride');
      }
    }

    return ride;
  }

  // ─── PATCH /rides/:id/status (driver advances) ────────────────
  async updateStatus(
    rideId: string,
    userId: string,
    newStatus: RideStatus,
  ): Promise<Ride> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    // Only the assigned driver can advance the ride
    const driver = await this.driversService.findByUserId(userId);
    if (!driver || ride.driverId !== driver.id) {
      throw new ForbiddenException(
        'Only the assigned driver can update ride status',
      );
    }

    RideStateMachine.assertTransition(ride.status, newStatus);

    const fromStatus = ride.status;
    ride.status = newStatus;

    if (newStatus === RideStatus.IN_PROGRESS) {
      ride.startedAt = new Date();
    }

    if (newStatus === RideStatus.COMPLETED) {
      ride.completedAt = new Date();

      // Calculate actual duration
      if (ride.startedAt) {
        const ms = ride.completedAt.getTime() - ride.startedAt.getTime();
        ride.durationMinutes = Math.ceil(ms / 60_000);
      }

      // Final fare based on actual duration
      const fare = this.fareService.calculateFare(
        ride.distanceKm ?? 0,
        ride.durationMinutes ?? 0,
        ride.surgeMultiplier,
      );
      ride.finalFare = fare.total;

      // Release driver and increment trip count
      await this.driverRepo.update(driver.id, { activeRideId: null });
      await this.driverRepo.increment({ id: driver.id }, 'totalTrips', 1);
    }

    await this.rideRepo.save(ride);

    await this.rideEventRepo.save({
      rideId: ride.id,
      fromStatus,
      toStatus: newStatus,
      metadata:
        newStatus === RideStatus.COMPLETED
          ? { finalFare: ride.finalFare, durationMinutes: ride.durationMinutes }
          : null,
    });

    return ride;
  }

  // ─── PATCH /rides/:id/destination ──────────────────────────────
  async changeDestination(
    rideId: string,
    riderId: string,
    destinationText: string,
  ): Promise<Ride> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.riderId !== riderId) {
      throw new ForbiddenException('Not your ride');
    }

    if (
      ride.status !== RideStatus.DRIVER_ARRIVING &&
      ride.status !== RideStatus.IN_PROGRESS
    ) {
      throw new BusinessException(
        'DESTINATION_CHANGE_NOT_ALLOWED',
        'Destination can only be changed during driver_arriving or in_progress',
      );
    }

    const oldDestination = {
      lat: ride.destinationLat,
      lng: ride.destinationLng,
      address: ride.destinationAddress,
    };

    // Resolve new destination via LLM
    const resolved = await this.destinationResolver.resolve(destinationText, {
      lat: ride.pickupLat,
      lng: ride.pickupLng,
    });

    ride.destinationText = destinationText;
    ride.destinationLat = resolved.lat;
    ride.destinationLng = resolved.lng;
    ride.destinationAddress = resolved.address;

    // Recalculate fare
    const estimate = await this.fareService.estimateFare(
      ride.pickupLat,
      ride.pickupLng,
      resolved.lat,
      resolved.lng,
    );
    ride.estimatedFare = estimate.total;
    ride.distanceKm = estimate.distanceKm;
    ride.durationMinutes = estimate.estimatedMinutes;
    ride.surgeMultiplier = estimate.surgeMultiplier;

    await this.rideRepo.save(ride);

    // Audit event (same status → destination change)
    await this.rideEventRepo.save({
      rideId: ride.id,
      fromStatus: ride.status,
      toStatus: ride.status,
      metadata: {
        type: 'destination_changed',
        from: oldDestination,
        to: { lat: resolved.lat, lng: resolved.lng, address: resolved.address },
        newEstimatedFare: estimate.total,
      },
    });

    return ride;
  }

  // ─── POST /rides/:id/cancel ────────────────────────────────────
  async cancelRide(
    rideId: string,
    userId: string,
    role: Role,
    reason?: string,
  ): Promise<Ride> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    // ── Permission checks ──
    if (role === Role.RIDER) {
      if (ride.riderId !== userId) {
        throw new ForbiddenException('Not your ride');
      }
      // Riders cannot cancel during IN_PROGRESS
      if (ride.status === RideStatus.IN_PROGRESS) {
        throw new BusinessException(
          'CANCEL_NOT_ALLOWED',
          'Riders cannot cancel rides that are in progress',
        );
      }
    } else if (role === Role.DRIVER) {
      const driver = await this.driversService.findByUserId(userId);
      if (!driver || ride.driverId !== driver.id) {
        throw new ForbiddenException('Not your assigned ride');
      }
    }

    RideStateMachine.assertTransition(ride.status, RideStatus.CANCELLED);

    const fromStatus = ride.status;
    ride.status = RideStatus.CANCELLED;
    ride.cancelledAt = new Date();

    // Partial fare if driver cancels during IN_PROGRESS
    if (fromStatus === RideStatus.IN_PROGRESS && ride.startedAt) {
      const elapsedMs = Date.now() - ride.startedAt.getTime();
      const elapsedMinutes = elapsedMs / 60_000;
      const estimatedTotal = ride.durationMinutes ?? 15;
      const fraction = Math.min(elapsedMinutes / estimatedTotal, 1);
      const partialDistance = (ride.distanceKm ?? 0) * fraction;

      const fare = this.fareService.calculateFare(
        partialDistance,
        elapsedMinutes,
        ride.surgeMultiplier,
      );
      ride.finalFare = fare.total;
    }

    // Release driver
    if (ride.driverId) {
      await this.driverRepo.update(ride.driverId, { activeRideId: null });
    }

    await this.rideRepo.save(ride);

    await this.rideEventRepo.save({
      rideId: ride.id,
      fromStatus,
      toStatus: RideStatus.CANCELLED,
      metadata: {
        reason: reason ?? null,
        cancelledBy: role,
        partialFare: ride.finalFare ?? null,
      },
    });

    return ride;
  }
}
