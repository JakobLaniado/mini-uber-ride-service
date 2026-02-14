import { Command } from 'commander';
import chalk from 'chalk';
import { createClient, api } from '../api';
import { getToken, getBaseUrl } from '../config';

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
  driver?: { user?: { name?: string } };
  dispatchReasoning?: string;
}

export function rideCommands(program: Command): void {
  const ride = program.command('ride').description('Ride commands');

  ride
    .command('create')
    .description('Request a new ride')
    .requiredOption('--pickup-lat <lat>', 'Pickup latitude', parseFloat)
    .requiredOption('--pickup-lng <lng>', 'Pickup longitude', parseFloat)
    .requiredOption('--dest <text>', 'Destination (natural language)')
    .action(async (opts) => {
      const token = getToken('rider');
      if (!token) {
        console.error(chalk.red('\n  No rider token. Run: miniuber auth login -r rider'));
        return;
      }
      const client = createClient(getBaseUrl(), token);
      const result = await api<Ride>(client, 'post', '/rides', {
        pickupLat: opts.pickupLat,
        pickupLng: opts.pickupLng,
        destinationText: opts.dest,
      });

      console.log(chalk.green(`\n  Ride created: ${result.id}`));
      console.log(chalk.gray(`  Destination: ${result.destinationAddress}`));
      console.log(chalk.gray(`  Coords: ${result.destinationLat}, ${result.destinationLng}`));
      console.log(chalk.gray(`  Estimated fare: $${result.estimatedFare}`));
    });

  ride
    .command('match')
    .description('Find and assign a driver (AI dispatch)')
    .argument('<rideId>', 'Ride ID')
    .action(async (rideId) => {
      const token = getToken('rider');
      if (!token) {
        console.error(chalk.red('\n  No rider token.'));
        return;
      }
      const client = createClient(getBaseUrl(), token);
      const result = await api<Ride>(client, 'post', `/rides/${rideId}/match`);

      console.log(chalk.green(`\n  Driver matched!`));
      console.log(chalk.gray(`  Driver: ${result.driver?.user?.name ?? 'Unknown'}`));
      if (result.dispatchReasoning) {
        console.log(chalk.cyan(`  AI reasoning: ${result.dispatchReasoning}`));
      }
    });

  ride
    .command('advance')
    .description('Advance ride status (driver)')
    .argument('<rideId>', 'Ride ID')
    .requiredOption('-s, --status <status>', 'New status (driver_arriving, in_progress, completed)')
    .action(async (rideId, opts) => {
      const token = getToken('driver');
      if (!token) {
        console.error(chalk.red('\n  No driver token.'));
        return;
      }
      const client = createClient(getBaseUrl(), token);
      const result = await api<Ride>(client, 'patch', `/rides/${rideId}/status`, {
        status: opts.status,
      });

      console.log(chalk.green(`\n  Ride status: ${result.status}`));
      if (result.finalFare != null) {
        console.log(chalk.cyan(`  Final fare: $${result.finalFare}`));
      }
    });

  ride
    .command('destination')
    .description('Change destination mid-ride')
    .argument('<rideId>', 'Ride ID')
    .requiredOption('--text <text>', 'New destination')
    .action(async (rideId, opts) => {
      const token = getToken('rider');
      if (!token) {
        console.error(chalk.red('\n  No rider token.'));
        return;
      }
      const client = createClient(getBaseUrl(), token);
      const result = await api<Ride>(client, 'patch', `/rides/${rideId}/destination`, {
        destinationText: opts.text,
      });

      console.log(chalk.green(`\n  Destination updated: ${result.destinationAddress}`));
      console.log(chalk.gray(`  New estimated fare: $${result.estimatedFare}`));
    });

  ride
    .command('cancel')
    .description('Cancel a ride')
    .argument('<rideId>', 'Ride ID')
    .option('--reason <reason>', 'Cancellation reason')
    .option('--as <role>', 'Cancel as rider or driver', 'rider')
    .action(async (rideId, opts) => {
      const token = getToken(opts.as === 'driver' ? 'driver' : 'rider');
      if (!token) {
        console.error(chalk.red(`\n  No ${opts.as} token.`));
        return;
      }
      const client = createClient(getBaseUrl(), token);
      await api(client, 'post', `/rides/${rideId}/cancel`, {
        ...(opts.reason && { reason: opts.reason }),
      });

      console.log(chalk.yellow(`\n  Ride ${rideId} cancelled.`));
    });
}
