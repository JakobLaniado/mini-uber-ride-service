import { Command } from 'commander';
import { authCommands } from './commands/auth';
import { driverCommands } from './commands/driver';
import { rideCommands } from './commands/rides';
import { demoCommand } from './commands/demo';
import { setBaseUrl } from './config';

const program = new Command();

program
  .name('miniuber')
  .description('CLI client for Mini Uber ride-hailing API')
  .version('1.0.0')
  .option(
    '--base-url <url>',
    'API base URL (default: MINIUBER_BASE_URL or http://localhost:3000)',
  )
  .hook('preAction', (thisCommand) => {
    const baseUrl =
      thisCommand.opts().baseUrl ||
      process.env.MINIUBER_BASE_URL;
    if (baseUrl) setBaseUrl(baseUrl);
  });

authCommands(program);
driverCommands(program);
rideCommands(program);
demoCommand(program);

program.parse();
