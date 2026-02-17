import { UserRole } from "@/common/enums/user-role.enum";
import { UserStatus } from "@/common/enums/user-status.enum";
import { Role } from "@/modules/permissions/entities/role.entity";
import { Property } from "@/modules/properties/entities/property.entity";
import { Tenant, TenantStatus } from "@/modules/tenants/entities/tenant.entity";
import { Unit, UnitType } from "@/modules/units/entities/unit.entity";
import { User } from "@/modules/users/entities/user.entity";
import * as bcrypt from "bcryptjs";
import { DataSource } from "typeorm";

const PROPERTIES_DATA = [
  {
    name: "Sunrise Apartments",
    location: "Westlands, Nairobi",
    address: "123 Waiyaki Way, Westlands",
    paybillNumber: "123456",
    units: [
      { unitNumber: "A-101", rentAmount: 25000, unitType: UnitType.ONE_BEDROOM },
      { unitNumber: "A-102", rentAmount: 25000, unitType: UnitType.ONE_BEDROOM },
      { unitNumber: "A-103", rentAmount: 28000, unitType: UnitType.TWO_BEDROOM },
      { unitNumber: "B-201", rentAmount: 30000, unitType: UnitType.TWO_BEDROOM },
      { unitNumber: "B-202", rentAmount: 30000, unitType: UnitType.TWO_BEDROOM },
      { unitNumber: "B-203", rentAmount: 35000, unitType: UnitType.THREE_BEDROOM },
    ],
  },
  {
    name: "Kilimani Heights",
    location: "Kilimani, Nairobi",
    address: "45 Argwings Kodhek Road, Kilimani",
    paybillNumber: "789012",
    units: [
      { unitNumber: "101", rentAmount: 35000, unitType: UnitType.ONE_BEDROOM },
      { unitNumber: "102", rentAmount: 35000, unitType: UnitType.ONE_BEDROOM },
      { unitNumber: "103", rentAmount: 38000, unitType: UnitType.TWO_BEDROOM },
      { unitNumber: "201", rentAmount: 40000, unitType: UnitType.TWO_BEDROOM },
      { unitNumber: "202", rentAmount: 40000, unitType: UnitType.TWO_BEDROOM },
      { unitNumber: "203", rentAmount: 42000, unitType: UnitType.THREE_BEDROOM },
      { unitNumber: "301", rentAmount: 45000, unitType: UnitType.THREE_BEDROOM },
    ],
  },
  {
    name: "South B Gardens",
    location: "South B, Nairobi",
    address: "78 Mombasa Road, South B",
    paybillNumber: "345678",
    units: [
      { unitNumber: "G-01", rentAmount: 18000, unitType: UnitType.BEDSITTER },
      { unitNumber: "G-02", rentAmount: 18000, unitType: UnitType.BEDSITTER },
      { unitNumber: "G-03", rentAmount: 20000, unitType: UnitType.STUDIO },
      { unitNumber: "F-01", rentAmount: 22000, unitType: UnitType.ONE_BEDROOM },
      { unitNumber: "F-02", rentAmount: 22000, unitType: UnitType.ONE_BEDROOM },
    ],
  },
];

const TENANTS_DATA = [
  { firstName: "Mary", lastName: "Njeri", email: "mary.njeri@email.co.ke", phone: "0711223344", property: 0, unit: 0 },
  { firstName: "Peter", lastName: "Ochieng", email: "peter.ochieng@email.co.ke", phone: "0722334466", property: 0, unit: 1 },
  { firstName: "Grace", lastName: "Akinyi", email: "grace.akinyi@email.co.ke", phone: "0733445577", property: 0, unit: 2 },
  { firstName: "David", lastName: "Mwangi", email: "david.mwangi@email.co.ke", phone: "0744556677", property: 0, unit: 3 },
  { firstName: "Sarah", lastName: "Wambui", email: "sarah.wambui@email.co.ke", phone: "0755667788", property: 1, unit: 0 },
  { firstName: "Joseph", lastName: "Otieno", email: "joseph.otieno@email.co.ke", phone: "0766778899", property: 1, unit: 1 },
  { firstName: "Agnes", lastName: "Chebet", email: "agnes.chebet@email.co.ke", phone: "0777889900", property: 1, unit: 2 },
  { firstName: "Michael", lastName: "Kiprop", email: "michael.kiprop@email.co.ke", phone: "0788990011", property: 1, unit: 3 },
  { firstName: "Faith", lastName: "Moraa", email: "faith.moraa@email.co.ke", phone: "0799001122", property: 1, unit: 4 },
  { firstName: "James", lastName: "Mutua", email: "james.mutua@email.co.ke", phone: "0710112233", property: 2, unit: 0 },
  { firstName: "Esther", lastName: "Nyambura", email: "esther.nyambura@email.co.ke", phone: "0721223344", property: 2, unit: 1 },
  { firstName: "Charles", lastName: "Kimani", email: "charles.kimani@email.co.ke", phone: "0732334456", property: 2, unit: 2 },
];

export class PropertiesUnitsTenantsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const propertyRepo = dataSource.getRepository(Property);
    const unitRepo = dataSource.getRepository(Unit);
    const tenantRepo = dataSource.getRepository(Tenant);
    const userRepo = dataSource.getRepository(User);
    const roleRepo = dataSource.getRepository(Role);

    console.log("Seeding properties, units, and tenants...");

    const tenantRole = await roleRepo.findOne({ where: { name: UserRole.TENANT } });
    if (!tenantRole) {
      console.error("  TENANT role not found. Run permissions seed first.");
      return;
    }

    // Track created properties and units for tenant assignment
    const createdProperties: Property[] = [];
    const createdUnits: Unit[][] = [];

    // Seed Properties + Units
    for (const propData of PROPERTIES_DATA) {
      let property = await propertyRepo.findOne({ where: { name: propData.name } });

      if (!property) {
        property = propertyRepo.create({
          name: propData.name,
          location: propData.location,
          address: propData.address,
          paybillNumber: propData.paybillNumber,
          totalUnits: propData.units.length,
          isActive: true,
        });
        property = await propertyRepo.save(property);
        console.log(`  Created property: ${propData.name}`);
      } else {
        console.log(`  Property already exists: ${propData.name}`);
      }

      createdProperties.push(property);

      const propertyUnits: Unit[] = [];
      for (const unitData of propData.units) {
        let unit = await unitRepo.findOne({
          where: { propertyId: property.propertyId, unitNumber: unitData.unitNumber },
        });

        if (!unit) {
          unit = unitRepo.create({
            unitNumber: unitData.unitNumber,
            propertyId: property.propertyId,
            rentAmount: unitData.rentAmount,
            unitType: unitData.unitType,
            isOccupied: false,
          });
          unit = await unitRepo.save(unit);
          console.log(`    Created unit: ${unitData.unitNumber} (KES ${unitData.rentAmount.toLocaleString()})`);
        }

        propertyUnits.push(unit);
      }
      createdUnits.push(propertyUnits);
    }

    // Seed Tenants
    const hashedPassword = await bcrypt.hash("Tenant@254", 12);

    for (const tenantData of TENANTS_DATA) {
      const existingUser = await userRepo.findOne({ where: { email: tenantData.email } });
      if (existingUser) {
        console.log(`  Tenant user already exists: ${tenantData.email}`);
        continue;
      }

      const unit = createdUnits[tenantData.property]?.[tenantData.unit];
      if (!unit) {
        console.log(`  Unit not found for tenant: ${tenantData.email}`);
        continue;
      }

      // Create tenant user
      const user = userRepo.create({
        firstName: tenantData.firstName,
        lastName: tenantData.lastName,
        email: tenantData.email,
        phone: tenantData.phone,
        password: hashedPassword,
        roleId: tenantRole.roleId,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      });
      const savedUser = await userRepo.save(user);

      // Create tenant record
      const tenant = tenantRepo.create({
        userId: savedUser.userId,
        unitId: unit.unitId,
        walletBalance: Math.floor(Math.random() * 15000), // Random wallet balance 0-15000
        status: TenantStatus.ACTIVE,
        leaseStart: new Date("2025-01-01"),
      });
      await tenantRepo.save(tenant);

      // Mark unit as occupied
      await unitRepo.update(unit.unitId, { isOccupied: true });

      console.log(`  Created tenant: ${tenantData.firstName} ${tenantData.lastName} → Unit ${unit.unitNumber}`);
    }

    console.log("Properties, units, and tenants seeding completed!");
  }
}
