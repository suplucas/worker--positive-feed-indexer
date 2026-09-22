import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { Follow } from './entity/Follow.js';

@Controller()
export class AppController {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
  ) {}

  @EventPattern('post_created')
  async handlePostCreated(
    @Payload()
    data: {
      userId: string;
      postId: string;
      postData: Record<string, unknown>;
      timestamp: number;
    },
  ) {
    await this.redisClient.hset(
      `review:${data.postId}`,
      this.serialize(data.postData),
    );

    const follows = await this.followRepository.find({
      where: { followingId: data.userId },
      select: ['followerId'],
    });
    const followerIds = follows.map((f) => f.followerId);

    // celebridade: não faz fan-out em massa; só o próprio autor
    if (followerIds.length > 5000) {
      await this.redisClient.zadd(
        `user:${data.userId}:feed`,
        data.timestamp,
        data.postId,
      );
      return;
    }

    const allIds = [...new Set([data.userId, ...followerIds])];
    const chunkSize = 1000;
    for (let i = 0; i < allIds.length; i += chunkSize) {
      const chunk = allIds.slice(i, i + chunkSize);
      const pipeline = this.redisClient.pipeline();
      chunk.forEach((id) => {
        const feedKey = `user:${id}:feed`;
        pipeline.zadd(feedKey, data.timestamp, data.postId);
        pipeline.zremrangebyrank(feedKey, 0, -201);
      });
      await pipeline.exec();
    }
  }

  @EventPattern('feed_rebuild')
  async handleFeedRebuild(
    @Payload()
    data: {
      userId: string;
      posts: Record<string, unknown>[];
    },
  ) {
    const feedKey = `user:${data.userId}:feed`;
    const pipeline = this.redisClient.pipeline();
    for (const post of data.posts) {
      const postId = String(post.id);
      pipeline.hset(`review:${postId}`, this.serialize(post));
      const createdAt = post.createdAt
        ? Date.parse(String(post.createdAt))
        : Date.now();
      pipeline.zadd(feedKey, createdAt, postId);
    }
    pipeline.zremrangebyrank(feedKey, 0, -201);
    await pipeline.exec();
  }

  private serialize(data: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      if (value instanceof Date) {
        out[key] = value.toISOString();
      } else if (typeof value === 'object') {
        out[key] = JSON.stringify(value);
      } else {
        out[key] = String(value);
      }
    }
    return out;
  }
}
