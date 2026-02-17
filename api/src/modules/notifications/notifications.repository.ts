import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsRepository extends AbstractRepository<Notification> {
	constructor(
		@InjectRepository(Notification)
		private readonly notificationRepository: Repository<Notification>,
	) {
		super(notificationRepository);
	}

	createQueryBuilder(alias: string) {
		return this.notificationRepository.createQueryBuilder(alias);
	}
}
