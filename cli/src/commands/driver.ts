import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { createClient, api } from '../api';
import { getToken, getBaseUrl } from '../config';

export function driverCommands(program: Command): void {
  const driver = program.command('driver').description('Driver commands');

  driver
    .command('register')
    .description('Register driver profile')
    .option('--make <make>', 'Vehicle make')
    .option('--model <model>', 'Vehicle model')
    .option('--color <color>', 'Vehicle color')
    .option('--plate <plate>', 'License plate')
    .action(async (opts) => {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'make', message: 'Vehicle make:', when: !opts.make },
        { type: 'input', name: 'model', message: 'Vehicle model:', when: !opts.model },
        { type: 'input', name: 'color', message: 'Vehicle color:', when: !opts.color },
        { type: 'input', name: 'plate', message: 'License plate:', when: !opts.plate },
      ]);

      const params = { ...opts, ...answers };
      const token = getToken('driver');
      if (!token) {
        console.error(chalk.red('\n  No driver token. Run: miniuber auth login -r driver'));
        return;
      }

      const client = createClient(getBaseUrl(), token);
      await api(client, 'post', '/drivers/register', {
        vehicleMake: params.make,
        vehicleModel: params.model,
        vehicleColor: params.color,
        licensePlate: params.plate,
      });

      console.log(chalk.green('\n  Driver profile registered.'));
    });

  driver
    .command('online')
    .description('Go online')
    .action(async () => {
      const token = getToken('driver');
      if (!token) {
        console.error(chalk.red('\n  No driver token.'));
        return;
      }
      const client = createClient(getBaseUrl(), token);
      await api(client, 'patch', '/drivers/me/status', { isOnline: true });
      console.log(chalk.green('\n  Driver is now ONLINE'));
    });

  driver
    .command('offline')
    .description('Go offline')
    .action(async () => {
      const token = getToken('driver');
      if (!token) {
        console.error(chalk.red('\n  No driver token.'));
        return;
      }
      const client = createClient(getBaseUrl(), token);
      await api(client, 'patch', '/drivers/me/status', { isOnline: false });
      console.log(chalk.yellow('\n  Driver is now OFFLINE'));
    });

  driver
    .command('location')
    .description('Update GPS location')
    .requiredOption('--lat <lat>', 'Latitude', parseFloat)
    .requiredOption('--lng <lng>', 'Longitude', parseFloat)
    .action(async (opts) => {
      const token = getToken('driver');
      if (!token) {
        console.error(chalk.red('\n  No driver token.'));
        return;
      }
      const client = createClient(getBaseUrl(), token);
      await api(client, 'patch', '/drivers/me/location', {
        lat: opts.lat,
        lng: opts.lng,
      });
      console.log(chalk.green(`\n  Location updated: ${opts.lat}, ${opts.lng}`));
    });
}
