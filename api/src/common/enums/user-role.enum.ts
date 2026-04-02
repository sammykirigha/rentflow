export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_OWNER = 'ORG_OWNER',
  ORG_MANAGER = 'ORG_MANAGER',
  ORG_TENANT = 'ORG_TENANT',
  // Legacy aliases (kept for backward compatibility during migration)
  LANDLORD = 'ORG_OWNER',
  MANAGER = 'ORG_MANAGER',
  TENANT = 'ORG_TENANT',
}
