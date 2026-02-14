import axios, { AxiosInstance, AxiosError } from 'axios';
import chalk from 'chalk';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string; details?: string[] } | null;
  meta: { timestamp: string };
}

export function createClient(baseUrl: string, token?: string): AxiosInstance {
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    timeout: 15000,
  });

  return client;
}

export async function api<T>(
  client: AxiosInstance,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  data?: Record<string, unknown>,
): Promise<T> {
  try {
    const res = await client.request<ApiEnvelope<T>>({ method, url, data });
    if (!res.data.success) {
      const err = res.data.error;
      throw new Error(err ? `${err.code}: ${err.message}` : 'Unknown error');
    }
    return res.data.data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.data) {
      const body = err.response.data as ApiEnvelope<null>;
      if (body.error) {
        console.error(
          chalk.red(`\n  Error: ${body.error.code} — ${body.error.message}`),
        );
        if (body.error.details) {
          body.error.details.forEach((d) =>
            console.error(chalk.yellow(`    • ${d}`)),
          );
        }
        process.exit(1);
      }
    }
    if (err instanceof AxiosError) {
      console.error(
        chalk.red(`\n  Network error: ${err.message}`),
      );
      process.exit(1);
    }
    throw err;
  }
}
