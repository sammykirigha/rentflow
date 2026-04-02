import { AbstractEntity } from '@/database/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('platform_config')
@Index(['key'], { unique: true })
export class PlatformConfig extends AbstractEntity<PlatformConfig> {
	@PrimaryGeneratedColumn('uuid', { name: 'platform_config_id' })
	platformConfigId: string;

	@Column({ unique: true })
	key: string;

	@Column({ type: 'text' })
	value: string;

	@Column({ nullable: true })
	description?: string;
}
