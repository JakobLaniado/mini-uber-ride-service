import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createClient, api } from '../api';
import { getBaseUrl } from '../config';

interface AuthResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  accessToken: string;
}

interface Ride {
  id: string;
  status: string;
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  estimatedFare: number;
  finalFare: number | null;
  dispatchReasoning?: string;
  driver?: { user?: { name?: string }; vehicleMake?: string; vehicleModel?: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function demoCommand(program: Command): void {
  program
    .command('demo')
    .description('Run a full ride lifecycle demo')
    .action(async () => {
      const baseUrl = getBaseUrl();
      const ts = Date.now();

      console.log(chalk.bold.cyan('\n  === Mini Uber — Full Lifecycle Demo ===\n'));

      // 1. Register rider
      let spinner = ora('Registering rider...').start();
      const riderClient = createClient(baseUrl);
      const rider = await api<AuthResponse>(riderClient, 'post', '/auth/register', {
        email: `rider-${ts}@demo.com`,
        password: 'Demo123!',
        name: 'Alice (Rider)',
        role: 'rider',
      });
      spinner.succeed(chalk.green(`Rider registered: ${rider.email}`));

      // 2. Register driver
      spinner = ora('Registering driver...').start();
      const driverAuth = await api<AuthResponse>(riderClient, 'post', '/auth/register', {
        email: `driver-${ts}@demo.com`,
        password: 'Demo123!',
        name: 'Bob (Driver)',
        role: 'driver',
      });
      spinner.succeed(chalk.green(`Driver registered: ${driverAuth.email}`));

      // 3. Setup driver profile
      const driverClient = createClient(baseUrl, driverAuth.accessToken);
      spinner = ora('Setting up driver profile...').start();
      await api(driverClient, 'post', '/drivers/register', {
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        vehicleColor: 'White',
        licensePlate: `DEMO-${ts.toString().slice(-4)}`,
      });
      spinner.succeed(chalk.green('Driver profile created: Toyota Camry'));

      // 4. Go online + set location (Times Square area)
      spinner = ora('Driver going online...').start();
      await api(driverClient, 'patch', '/drivers/me/status', { isOnline: true });
      await api(driverClient, 'patch', '/drivers/me/location', {
        lat: 40.76,
        lng: -73.98,
      });
      spinner.succeed(chalk.green('Driver online near Times Square (40.76, -73.98)'));

      // 5. Create ride
      const authedRiderClient = createClient(baseUrl, rider.accessToken);
      spinner = ora('Creating ride to JFK Airport...').start();
      const ride = await api<Ride>(authedRiderClient, 'post', '/rides', {
        pickupLat: 40.758,
        pickupLng: -73.9855,
        destinationText: 'JFK Airport',
      });
      spinner.succeed(chalk.green(`Ride created: ${ride.id}`));
      console.log(chalk.gray(`    Destination: ${ride.destinationAddress}`));
      console.log(chalk.gray(`    Estimated fare: $${ride.estimatedFare}`));

      // 6. Match (AI dispatch)
      spinner = ora('AI dispatching driver...').start();
      const matched = await api<Ride>(authedRiderClient, 'post', `/rides/${ride.id}/match`);
      spinner.succeed(chalk.green('Driver matched!'));
      if (matched.driver) {
        console.log(
          chalk.gray(
            `    Driver: ${matched.driver.user?.name ?? 'Unknown'} (${matched.driver.vehicleMake} ${matched.driver.vehicleModel})`,
          ),
        );
      }
      if (matched.dispatchReasoning) {
        console.log(chalk.cyan(`    AI reasoning: ${matched.dispatchReasoning}`));
      }

      // 7. Advance through states
      const states = ['driver_arriving', 'in_progress', 'completed'] as const;
      for (const status of states) {
        await sleep(500);
        spinner = ora(`Advancing to ${status}...`).start();
        const updated = await api<Ride>(
          driverClient,
          'patch',
          `/rides/${ride.id}/status`,
          { status },
        );
        spinner.succeed(chalk.green(`Status: ${updated.status}`));
        if (updated.finalFare != null) {
          console.log(chalk.bold.green(`\n    Final fare: $${updated.finalFare}`));
        }
      }

      console.log(chalk.bold.cyan('\n  === Demo Complete ===\n'));
    });
}
