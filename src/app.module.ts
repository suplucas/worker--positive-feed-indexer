import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import { AppController } from './app.controller.js';
import { Follow } from './entity/Follow.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL }
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
        process.env.REDIS_URL
          ? new Redis(process.env.REDIS_URL)
          : new Redis({
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379', 10),
            }),
    },
  ],
})
export class AppModule {}
