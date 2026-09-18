import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @EventPattern('post_created')
  async handlePostCreated(
    @Payload()
    data: {
      userId: string;
      postId: string;
      postData: any;
      timestamp: number;
    },
  ) {
    // 1. Salva o conteúdo do post de forma única no Redis (Operação O(1) - Super rápida)
    await this.redisClient.hset(
      `review:${data.postId}`,
      this.serialize(data.postData),
    );

    // 2. Busca os IDs dos seguidores do banco (Ex: retorna um array de strings)
    const followerIds = await this.followerRepository.getFollowerIds(
      data.userId,
    );

    // SE FOR UMA CELEBRIDADE: Você interrompe aqui e não atualiza o feed de ninguém!
    if (followerIds.length > 5000) {
      // Adiciona o post apenas numa lista global de "posts de celebridades"
      await this.redisClient.zadd(
        `user:${data.userId}:posts`,
        data.timestamp,
        data.postId,
      );
      return;
    }

    // SE FOR USUÁRIO COMUM: Divide os seguidores em lotes de 1000 para não estourar a memória
    const chunkSize = 1000;
    for (let i = 0; i < followerIds.length; i += chunkSize) {
      const chunk = followerIds.slice(i, i + chunkSize);

      // Abre um pipeline para enviar 1000 comandos de uma vez só ao Redis
      const pipeline = this.redisClient.pipeline();

      chunk.forEach((followerId) => {
        const feedKey = `user:${followerId}:feed`;
        pipeline.zadd(feedKey, data.timestamp, data.postId);
        // Mantém o feed do usuário leve (ex: apenas as últimas 200 postagens)
        pipeline.zremrangebyrank(feedKey, 0, -201);
      });

      // Executa as 1000 inserções em uma única viagem de rede
      await pipeline.exec();
    }
  }
}
