import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

export interface AdminStats {
	totalUsers: number;
	usersChange: number;
	usersChangePercent: string;
	usersTrend: 'up' | 'down';
}
export interface RecentUser {
	id: string;
	name: string;
	email: string;
	joinDate: string;
}

export interface AdminDashboardData {
	stats: AdminStats;
	recentUsers: RecentUser[];
}

@Injectable()
export class AdminStatsService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) { }

	async getAdminStats(): Promise<AdminStats> {
		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const startOfYesterday = new Date(startOfToday);
		startOfYesterday.setDate(startOfYesterday.getDate() - 1);

		const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

		// User stats
		const [totalUsers, usersThisMonth, usersLastMonth] = await Promise.all([
			this.userRepository.count(),
			this.userRepository.count({
				where: { createdAt: MoreThanOrEqual(startOfThisMonth) },
			}),
			this.userRepository.count({
				where: { createdAt: Between(startOfLastMonth, endOfLastMonth) },
			}),
		]);

		const usersChange = usersThisMonth - usersLastMonth;
		const usersChangePercent = usersLastMonth > 0
			? ((usersChange / usersLastMonth) * 100).toFixed(1)
			: usersThisMonth > 0 ? '100' : '0';


		return {
			totalUsers,
			usersChange,
			usersChangePercent: `${usersChange >= 0 ? '+' : ''}${usersChangePercent}%`,
			usersTrend: usersChange >= 0 ? 'up' : 'down',
		};
	}

	async getRecentUsers(limit: number = 5): Promise<RecentUser[]> {
		const users = await this.userRepository.find({
			order: { createdAt: 'DESC' },
			take: limit,
		});

		if (users.length === 0) {
			return [];
		}

		// Get user IDs
		const userIds = users.map(u => u.userId);

		return users.map((user) => {
			return {
				id: user.userId,
				name: user.fullName,
				email: user.email,
				joinDate: user.createdAt.toISOString().split('T')[0],
			};
		});
	}

	async getDashboardData(): Promise<AdminDashboardData> {
		const [stats, recentUsers] = await Promise.all([
			this.getAdminStats(),
			this.getRecentUsers(),
		]);

		return {
			stats,
			recentUsers,
		};
	}
}
