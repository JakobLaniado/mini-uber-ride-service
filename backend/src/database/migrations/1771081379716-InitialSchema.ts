import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1771081379716 implements MigrationInterface {
  name = 'InitialSchema1771081379716';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."ride_events_from_status_enum" AS ENUM('requested', 'matched', 'driver_arriving', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ride_events_to_status_enum" AS ENUM('requested', 'matched', 'driver_arriving', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ride_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ride_id" uuid NOT NULL, "from_status" "public"."ride_events_from_status_enum" NOT NULL, "to_status" "public"."ride_events_to_status_enum" NOT NULL, "metadata" jsonb, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a408fbed7f187bf7e160bf19155" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rides_status_enum" AS ENUM('requested', 'matched', 'driver_arriving', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "rides" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rider_id" uuid NOT NULL, "driver_id" uuid, "status" "public"."rides_status_enum" NOT NULL DEFAULT 'requested', "pickup_lat" double precision NOT NULL, "pickup_lng" double precision NOT NULL, "pickup_address" character varying, "destination_lat" double precision, "destination_lng" double precision, "destination_text" character varying NOT NULL, "destination_address" character varying, "estimated_fare" numeric(10,2), "final_fare" numeric(10,2), "surge_multiplier" double precision NOT NULL DEFAULT '1', "distance_km" double precision, "duration_minutes" integer, "dispatch_reasoning" text, "requested_at" TIMESTAMP NOT NULL DEFAULT now(), "matched_at" TIMESTAMP, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "cancelled_at" TIMESTAMP, CONSTRAINT "PK_ca6f62fc1e999b139c7f28f07fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8ca08acdee36ad9774cbf1c57" ON "rides" ("rider_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb13184768dea9734b022874c6" ON "rides" ("driver_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87b9253c85be51e3785d3653a8" ON "rides" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97f9911b21de0ca819d4bf0f17" ON "rides" ("rider_id", "requested_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "drivers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "vehicle_make" character varying NOT NULL, "vehicle_model" character varying NOT NULL, "vehicle_color" character varying NOT NULL, "license_plate" character varying NOT NULL, "is_online" boolean NOT NULL DEFAULT false, "currentLocation" geometry(Point,4326), "current_lat" double precision, "current_lng" double precision, "rating" double precision NOT NULL DEFAULT '5', "total_trips" integer NOT NULL DEFAULT '0', "active_ride_id" uuid, "location_updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8e224f1b8f05ace7cfc7c76d03b" UNIQUE ("user_id"), CONSTRAINT "UQ_b44653e1a519728b47dd986b310" UNIQUE ("license_plate"), CONSTRAINT "REL_8e224f1b8f05ace7cfc7c76d03" UNIQUE ("user_id"), CONSTRAINT "PK_92ab3fb69e566d3eb0cae896047" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_009d35735b513a7839455c7d49" ON "drivers" ("is_online") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dc6a97760a08fc680af123fb39" ON "drivers" USING GiST ("currentLocation") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('rider', 'driver', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "name" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'rider', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "surge_zones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "center" geometry(Point,4326) NOT NULL, "center_lat" double precision NOT NULL, "center_lng" double precision NOT NULL, "radius_km" double precision NOT NULL, "multiplier" double precision NOT NULL DEFAULT '1', "is_active" boolean NOT NULL DEFAULT true, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7d2301f02b8b6bc14061a8566a6" UNIQUE ("name"), CONSTRAINT "PK_6d8847f3b3d8d73bbd0b2f43ca7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b03f8afdbad12f4170f99603f2" ON "surge_zones" USING GiST ("center") `,
    );
    await queryRunner.query(
      `ALTER TABLE "ride_events" ADD CONSTRAINT "FK_578f8f74d64f852f842bdb4d453" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rides" ADD CONSTRAINT "FK_d8ca08acdee36ad9774cbf1c57a" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rides" ADD CONSTRAINT "FK_fb13184768dea9734b022874c6f" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" ADD CONSTRAINT "FK_8e224f1b8f05ace7cfc7c76d03b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "drivers" DROP CONSTRAINT "FK_8e224f1b8f05ace7cfc7c76d03b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rides" DROP CONSTRAINT "FK_fb13184768dea9734b022874c6f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rides" DROP CONSTRAINT "FK_d8ca08acdee36ad9774cbf1c57a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ride_events" DROP CONSTRAINT "FK_578f8f74d64f852f842bdb4d453"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b03f8afdbad12f4170f99603f2"`,
    );
    await queryRunner.query(`DROP TABLE "surge_zones"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dc6a97760a08fc680af123fb39"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_009d35735b513a7839455c7d49"`,
    );
    await queryRunner.query(`DROP TABLE "drivers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97f9911b21de0ca819d4bf0f17"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_87b9253c85be51e3785d3653a8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb13184768dea9734b022874c6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8ca08acdee36ad9774cbf1c57"`,
    );
    await queryRunner.query(`DROP TABLE "rides"`);
    await queryRunner.query(`DROP TYPE "public"."rides_status_enum"`);
    await queryRunner.query(`DROP TABLE "ride_events"`);
    await queryRunner.query(`DROP TYPE "public"."ride_events_to_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."ride_events_from_status_enum"`,
    );
  }
}
