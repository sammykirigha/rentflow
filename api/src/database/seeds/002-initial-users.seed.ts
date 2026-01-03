import { UserRole } from "@/common/enums/user-role.enum";
import { UserStatus } from "@/common/enums/user-status.enum";
import { Role } from "@/modules/permissions/entities/role.entity";
import * as bcrypt from "bcryptjs";
import { DataSource } from "typeorm";
import { User } from "../../modules/users/entities/user.entity";

export class InitialUsersSeed {
    public async run(dataSource: DataSource): Promise<void> {
        const userRepository = dataSource.getRepository(User);
        const roleRepository = dataSource.getRepository(Role);

        console.log("🌱 Seeding initial users...");

        const roles = await roleRepository.find();

        // Define initial users
        const initialUsers: Partial<User>[] = [
            {
                firstName: "Super",
                lastName: "Maina",
                email: "mainrobert04@gmail.com",
                emailVerified: true,
                password: "Maina@254???",
                status: UserStatus.ACTIVE,
                phone: "0700207054",
                roleId: roles.find((r) => r.name === UserRole.SUPER_ADMIN)?.roleId,
                phoneVerified: true,
            },
        ];

        // Process each user
        for (const userData of initialUsers) {
            const existingUser = await userRepository.findOne({
                where: { email: userData.email },
            });

            if (!existingUser) {
                // Hash password
                const hashedPassword = await bcrypt.hash(userData.password, 12);
                // Create user
                const user = userRepository.create({
                    ...userData,
                    password: hashedPassword,
                });
                await userRepository.save(user);
                console.log(`✅ Created ${userData.userRole?.name}: ${userData.email}`);
            } else {
                console.log(`⏭️  User already exists: ${userData.email}`);
            }
        }

        console.log("🎉 Initial users seeding completed!");
    }
}
