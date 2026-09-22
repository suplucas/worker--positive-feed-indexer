import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import { AppController } from './app.controller.js';
import { Follow } from './entity/Follow.js';

const dbUrl =
  process.env.DATABASE_URL ||
  (process.env.DB_HOST?.includes('://') ? process.env.DB_HOST : undefined);
const redisUrl =
  process.env.REDIS_URL ||
  (process.env.REDIS_HOST?.includes('://')
    ? process.env.REDIS_HOST
    : undefined);

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(dbUrl
        ? { url: dbUrl }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'sua_senha',
            database: process.env.DB_NAME || 'seu_banco',
          }),
      entities: [Follow],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Follow]),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () =>
        redisUrl
          ? new Redis(redisUrl)
          : new Redis({
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379', 10),
            }),
    },
  ],
})
export class AppModule {}
