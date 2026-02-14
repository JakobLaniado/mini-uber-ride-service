import { FareService, haversineDistanceKm } from './fare.service';
import { Repository } from 'typeorm';
import { SurgeZone } from './entities/surge-zone.entity';

describe('FareService', () => {
  let service: FareService;
  let surgeZoneRepo: jest.Mocked<Repository<SurgeZone>>;

  beforeEach(() => {
    surgeZoneRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    } as any;
    service = new FareService(surgeZoneRepo);
  });

  describe('calculateFare', () => {
    it('should calculate a basic fare', () => {
      // baseFare $2.50 + 10km * $1.50 + 20min * $0.25 = $2.50 + $15 + $5 = $22.50
      const fare = service.calculateFare(10, 20, 1.0);
      expect(fare.baseFare).toBe(2.5);
      expect(fare.distanceCharge).toBe(15);
      expect(fare.timeCharge).toBe(5);
      expect(fare.surgeMultiplier).toBe(1.0);
      expect(fare.total).toBe(22.5);
    });

    it('should apply surge multiplier', () => {
      // ($2.50 + $15 + $5) * 2.0 = $45
      const fare = service.calculateFare(10, 20, 2.0);
      expect(fare.total).toBe(45);
      expect(fare.surgeMultiplier).toBe(2.0);
    });

    it('should enforce minimum fare', () => {
      // Very short ride: $2.50 + 0.5 * $1.50 + 2 * $0.25 = $2.50 + $0.75 + $0.50 = $3.75
      // Below minimum $5.00
      const fare = service.calculateFare(0.5, 2, 1.0);
      expect(fare.total).toBe(5.0);
    });

    it('should handle zero distance and time', () => {
      const fare = service.calculateFare(0, 0, 1.0);
      expect(fare.total).toBe(5.0); // minimum fare
    });

    it('should apply surge multiplier even with minimum fare', () => {
      // Very short ride with 3x surge: $3.75 * 3 = $11.25 (above minimum)
      const fare = service.calculateFare(0.5, 2, 3.0);
      expect(fare.total).toBe(11.25);
    });
  });

  describe('haversineDistanceKm', () => {
    it('should calculate distance between two points', () => {
      // NYC Times Square to JFK Airport ≈ 19-20 km
      const distance = haversineDistanceKm(40.758, -73.9855, 40.6413, -73.7781);
      expect(distance).toBeGreaterThan(18);
      expect(distance).toBeLessThan(22);
    });

    it('should return 0 for same point', () => {
      const distance = haversineDistanceKm(40.758, -73.9855, 40.758, -73.9855);
      expect(distance).toBe(0);
    });

    it('should calculate short distances', () => {
      // ~1 block in NYC ≈ 0.08-0.12 km
      const distance = haversineDistanceKm(40.758, -73.9855, 40.759, -73.9855);
      expect(distance).toBeGreaterThan(0.05);
      expect(distance).toBeLessThan(0.2);
    });
  });
});
