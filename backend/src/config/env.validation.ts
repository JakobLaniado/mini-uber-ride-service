import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('postgres'),
  DB_NAME: Joi.string().default('mini_uber'),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  // App
  PORT: Joi.number().default(3000),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // Auth / OIDC
  AUTH_ISSUER: Joi.string().required(),
  AUTH_AUDIENCE: Joi.string().required(),

  // OpenRouter (optional)
  OPENROUTER_API_KEY: Joi.string().optional().allow(''),
});
