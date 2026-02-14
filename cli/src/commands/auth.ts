import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { createClient, api } from '../api';
import { saveToken, clearTokens, getBaseUrl } from '../config';

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; name: string; role: string };
}

export function authCommands(program: Command): void {
  const auth = program.command('auth').description('Authentication commands');

  auth
    .command('register')
    .description('Register a new user')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .option('-n, --name <name>', 'Display name')
    .option('-r, --role <role>', 'Role (rider or driver)')
    .action(async (opts) => {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Email:',
          when: !opts.email,
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          when: !opts.password,
        },
        {
          type: 'input',
          name: 'name',
          message: 'Name:',
          when: !opts.name,
        },
        {
          type: 'list',
          name: 'role',
          message: 'Role:',
          choices: ['rider', 'driver'],
          when: !opts.role,
        },
      ]);

      const params = { ...opts, ...answers };
      const client = createClient(getBaseUrl());
      const result = await api<AuthResponse>(client, 'post', '/auth/register', params);

      saveToken(params.role, result.accessToken);
      console.log(chalk.green(`\n  Registered as ${params.role}: ${result.user.email}`));
      console.log(chalk.gray(`  Token saved for ${params.role} role.`));
    });

  auth
    .command('login')
    .description('Login to get a token')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .option('-r, --role <role>', 'Save token as role (rider or driver)')
    .action(async (opts) => {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Email:',
          when: !opts.email,
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          when: !opts.password,
        },
        {
          type: 'list',
          name: 'role',
          message: 'Save token as:',
          choices: ['rider', 'driver'],
          when: !opts.role,
        },
      ]);

      const params = { ...opts, ...answers };
      const client = createClient(getBaseUrl());
      const result = await api<AuthResponse>(client, 'post', '/auth/login', {
        email: params.email,
        password: params.password,
      });

      saveToken(params.role, result.accessToken);
      console.log(chalk.green(`\n  Logged in as ${result.user.email}`));
      console.log(chalk.gray(`  Token saved for ${params.role} role.`));
    });

  auth
    .command('logout')
    .description('Clear saved tokens')
    .action(() => {
      clearTokens();
      console.log(chalk.green('\n  All tokens cleared.'));
    });
}
