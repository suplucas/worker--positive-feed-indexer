import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module.js';

const rawHost = process.env.REDIS_HOST || 'localhost';
const redisUrl =
  process.env.REDIS_URL || (rawHost.includes('://') ? rawHost : undefined);
const u = redisUrl ? new URL(redisUrl) : undefined;

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.REDIS,
      options: {
        host: u?.hostname ?? rawHost,
        port: parseInt(u?.port || process.env.REDIS_PORT || '6379', 10),
        ...(u
          ? { username: u.username, password: decodeURIComponent(u.password) }
          : {}),
      },
    },
  );
  await app.listen();
}
await bootstrap();
