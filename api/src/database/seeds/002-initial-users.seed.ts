import { UserRole } from "@/common/enums/user-role.enum";
import { UserStatus } from "@/common/enums/user-status.enum";
import { Organization, OrganizationStatus } from "@/modules/organizations/entities/organization.entity";
import { Role } from "@/modules/permissions/entities/role.entity";
import { Subscription, SubscriptionPlan, SubscriptionStatus } from "@/modules/subscriptions/entities/subscription.entity";
import * as bcrypt from "bcryptjs";
import { DataSource } from "typeorm";
import { User } from "../../modules/users/entities/user.entity";

export class InitialUsersSeed {
    public async run(dataSource: DataSource): Promise<void> {
        const userRepository = dataSource.getRepository(User);
        const roleRepository = dataSource.getRepository(Role);
        const orgRepository = dataSource.getRepository(Organization);
        const subscriptionRepository = dataSource.getRepository(Subscription);

        console.log("Seeding initial RentFlow users...");

        const roles = await roleRepository.find();

        // 1. Create SUPER_ADMIN user
        const superAdminRole = roles.find((r) => r.name === UserRole.SUPER_ADMIN);
        let superAdmin = await userRepository.findOne({
            where: { email: "admin@rentflow.co.ke" },
        });

        if (!superAdmin && superAdminRole) {
            const hashedPassword = await bcrypt.hash("SuperAdmin@254", 12);
            superAdmin = await userRepository.save(
                userRepository.create({
                    firstName: "Super",
                    lastName: "Admin",
                    email: "admin@rentflow.co.ke",
                    emailVerified: true,
                    password: hashedPassword,
                    status: UserStatus.ACTIVE,
                    phone: "0700000000",
                    roleId: superAdminRole.roleId,
                    phoneVerified: true,
                }),
            );
            console.log("  Created SUPER_ADMIN user: admin@rentflow.co.ke");
        } else {
            console.log("  SUPER_ADMIN user already exists: admin@rentflow.co.ke");
        }

        // 2. Create landlord user first (will be org owner)
        const landlordRole = roles.find((r) => r.name === UserRole.LANDLORD);
        let landlordUser = await userRepository.findOne({
            where: { email: "dkirigha18+landlord@gmail.com" },
        });

        if (!landlordUser && landlordRole) {
            const hashedPassword = await bcrypt.hash("Password@254", 12);
            landlordUser = await userRepository.save(
                userRepository.create({
                    firstName: "Samuel",
                    lastName: "Kirigha",
                    email: "dkirigha18+landlord@gmail.com",
                    emailVerified: true,
                    password: hashedPassword,
                    status: UserStatus.ACTIVE,
                    phone: "0707256013",
                    roleId: landlordRole.roleId,
                    phoneVerified: true,
                }),
            );
            console.log("  Created user: dkirigha18+landlord@gmail.com");
        } else {
            console.log("  User already exists: dkirigha18+landlord@gmail.com");
        }

        // 3. Create default organization and link to landlord
        let defaultOrg = await orgRepository.findOne({
            where: { slug: "default" },
        });

        if (!defaultOrg && landlordUser) {
            defaultOrg = await orgRepository.save(
                orgRepository.create({
                    name: "RentFlow Default",
                    slug: "default",
                    ownerUserId: landlordUser.userId,
                    status: OrganizationStatus.ACTIVE,
                }),
            );
            console.log("  Created default organization: RentFlow Default");

            // Link landlord to the org
            await userRepository.update(landlordUser.userId, {
                organizationId: defaultOrg.organizationId,
            });
            console.log("  Linked landlord to default organization");
        } else {
            console.log("  Default organization already exists");
        }

        // 4. Create trial subscription for default org
        if (defaultOrg) {
            const existingSub = await subscriptionRepository.findOne({
                where: { organizationId: defaultOrg.organizationId },
            });

            if (!existingSub) {
                const trialEndsAt = new Date();
                trialEndsAt.setDate(trialEndsAt.getDate() + 14);

                await subscriptionRepository.save(
                    subscriptionRepository.create({
                        organizationId: defaultOrg.organizationId,
                        plan: SubscriptionPlan.PRO,
                        status: SubscriptionStatus.TRIAL,
                        trialEndsAt,
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: trialEndsAt,
                        maxProperties: 10,
                        maxUnits: 200,
                        smsQuotaMonthly: 500,
                        maxManagerUsers: 5,
                        hasPdfExport: true,
                        hasBulkMessaging: true,
                        hasApiAccess: false,
                    }),
                );
                console.log("  Created trial subscription for default organization");
            }
        }

        // 5. Create remaining users and link to default org
        const otherUsers: Partial<User>[] = [
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

        for (const userData of otherUsers) {
            const existingUser = await userRepository.findOne({
                where: { email: userData.email },
            });

            if (!existingUser) {
                const hashedPassword = await bcrypt.hash(userData.password as string, 12);
                const user = userRepository.create({
                    ...userData,
                    password: hashedPassword,
                    organizationId: defaultOrg?.organizationId,
                });
                await userRepository.save(user);
                console.log(`  Created user: ${userData.email}`);
            } else if (defaultOrg && !existingUser.organizationId) {
                // Link existing user to default org if not yet linked
                await userRepository.update(existingUser.userId, {
                    organizationId: defaultOrg.organizationId,
                });
                console.log(`  Linked existing user ${userData.email} to default organization`);
            } else {
                console.log(`  User already exists: ${userData.email}`);
            }
        }

        console.log("Initial users seeding completed!");
    }
}
