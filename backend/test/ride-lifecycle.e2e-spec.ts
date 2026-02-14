import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

/**
 * E2E test: full ride lifecycle.
 * Requires running PostgreSQL (docker compose up -d).
 */
describe('Ride Lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let riderToken: string;
  let driverToken: string;
  let rideId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Auth setup ──────────────────────────────────────────────────

  it('should register a rider', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `rider-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Test Rider',
        role: 'rider',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    riderToken = res.body.data.accessToken;
  });

  it('should register a driver user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `driver-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Test Driver',
        role: 'driver',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    driverToken = res.body.data.accessToken;
  });

  // ── Driver setup ────────────────────────────────────────────────

  it('should register driver profile', async () => {
    const res = await request(app.getHttpServer())
      .post('/drivers/register')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        vehicleColor: 'White',
        licensePlate: `TEST-${Date.now()}`,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it('should set driver online', async () => {
    await request(app.getHttpServer())
      .patch('/drivers/me/status')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ isOnline: true })
      .expect(200);
  });

  it('should update driver location near pickup', async () => {
    await request(app.getHttpServer())
      .patch('/drivers/me/location')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ lat: 40.76, lng: -73.98 })
      .expect(200);
  });

  // ── Ride lifecycle ──────────────────────────────────────────────

  it('should create a ride (REQUESTED)', async () => {
    const res = await request(app.getHttpServer())
      .post('/rides')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        pickupLat: 40.758,
        pickupLng: -73.9855,
        destinationText: 'JFK Airport',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('requested');
    expect(res.body.data.destinationAddress).toBeDefined();
    expect(res.body.data.estimatedFare).toBeDefined();
    rideId = res.body.data.id;
  });

  it('should match ride with a driver (MATCHED)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rides/${rideId}/match`)
      .set('Authorization', `Bearer ${riderToken}`)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('matched');
    expect(res.body.data.driverId).toBeDefined();
    expect(res.body.data.dispatchReasoning).toBeDefined();
  });

  it('should advance to DRIVER_ARRIVING', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'driver_arriving' })
      .expect(200);

    expect(res.body.data.status).toBe('driver_arriving');
  });

  it('should allow destination change during DRIVER_ARRIVING', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/rides/${rideId}/destination`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ destinationText: 'Central Park' })
      .expect(200);

    expect(res.body.data.destinationAddress).toContain('Central Park');
    expect(res.body.data.estimatedFare).toBeDefined();
  });

  it('should advance to IN_PROGRESS', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'in_progress' })
      .expect(200);

    expect(res.body.data.status).toBe('in_progress');
    expect(res.body.data.startedAt).toBeDefined();
  });

  it('should complete the ride', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'completed' })
      .expect(200);

    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.completedAt).toBeDefined();
    expect(res.body.data.finalFare).toBeDefined();
    expect(Number(res.body.data.finalFare)).toBeGreaterThan(0);
  });

  // ── Validation: invalid transitions ─────────────────────────────

  it('should reject invalid state transition (completed → in_progress)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'in_progress' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  // ── Auth enforcement ────────────────────────────────────────────

  it('should reject ride creation without auth', async () => {
    await request(app.getHttpServer())
      .post('/rides')
      .send({ pickupLat: 40.758, pickupLng: -73.9855, destinationText: 'Airport' })
      .expect(401);
  });

  it('should reject driver-only endpoints for riders', async () => {
    await request(app.getHttpServer())
      .patch('/drivers/me/status')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ isOnline: true })
      .expect(403);
  });

  // ── History ─────────────────────────────────────────────────────

  it('should return rider ride history', async () => {
    const res = await request(app.getHttpServer())
      .get('/history/rides?page=1&limit=10')
      .set('Authorization', `Bearer ${riderToken}`)
      .expect(200);

    expect(res.body.data.rides.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('should return driver earnings', async () => {
    const res = await request(app.getHttpServer())
      .get('/history/driver/earnings')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    expect(res.body.data.totalRides).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalEarnings).toBeGreaterThan(0);
  });
});
