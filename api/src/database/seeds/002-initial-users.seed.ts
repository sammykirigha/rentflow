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

        console.log("Seeding initial RentFlow users...");

        const roles = await roleRepository.find();

        const initialUsers: Partial<User>[] = [
            {
                firstName: "Samuel",
                lastName: "Kirigha",
                email: "dkirigha18+landlord@gmail.com",
                emailVerified: true,
                password: "Password@254",
                status: UserStatus.ACTIVE,
                phone: "0707256013",
                roleId: roles.find((r) => r.name === UserRole.LANDLORD)?.roleId,
                phoneVerified: true,
            },
            {
                firstName: "Jane",
                lastName: "Wanjiku",
                email: "dkirigha18+manager@gmail.com",
                emailVerified: true,
                password: "Password@254",
                status: UserStatus.ACTIVE,
                phone: "0722334455",
                roleId: roles.find((r) => r.name === UserRole.MANAGER)?.roleId,
                phoneVerified: true,
            },
            {
                firstName: "John",
                lastName: "Kamau",
                email: "dkirigha18+tenant@gmail.com",
                emailVerified: true,
                password: "Password@254",
                status: UserStatus.ACTIVE,
                phone: "0733445566",
                roleId: roles.find((r) => r.name === UserRole.TENANT)?.roleId,
                phoneVerified: true,
            },
        ];

        for (const userData of initialUsers) {
            const existingUser = await userRepository.findOne({
                where: { email: userData.email },
            });

            if (!existingUser) {
                const hashedPassword = await bcrypt.hash(userData.password, 12);
                const user = userRepository.create({
                    ...userData,
                    password: hashedPassword,
                });
                await userRepository.save(user);
                console.log(`  Created user: ${userData.email}`);
            } else {
                console.log(`  User already exists: ${userData.email}`);
            }
        }

        console.log("Initial users seeding completed!");
    }
}
