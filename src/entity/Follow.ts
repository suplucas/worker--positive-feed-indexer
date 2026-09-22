import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'follows' })
@Unique(['followerId', 'followingId'])
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  followerId: string;

  @Column()
  followingId: string;
}
