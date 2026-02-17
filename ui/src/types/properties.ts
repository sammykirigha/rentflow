export interface Property {
  propertyId: string;
  name: string;
  location: string;
  address?: string;
  totalUnits: number;
  paybillNumber?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum UnitType {
  STUDIO = 'studio',
  BEDSITTER = 'bedsitter',
  ONE_BEDROOM = 'one_bedroom',
  TWO_BEDROOM = 'two_bedroom',
  THREE_BEDROOM = 'three_bedroom',
}

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  [UnitType.STUDIO]: 'Studio',
  [UnitType.BEDSITTER]: 'Bedsitter',
  [UnitType.ONE_BEDROOM]: '1 Bedroom',
  [UnitType.TWO_BEDROOM]: '2 Bedroom',
  [UnitType.THREE_BEDROOM]: '3 Bedroom',
};

export interface Unit {
  unitId: string;
  unitNumber: string;
  propertyId: string;
  unitType: UnitType;
  rentAmount: number;
  isOccupied: boolean;
  property?: Property;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyInput {
  name: string;
  location: string;
  address?: string;
  totalUnits: number;
  paybillNumber?: string;
}

export interface CreateUnitInput {
  unitNumber: string;
  propertyId: string;
  rentAmount: number;
  unitType?: UnitType;
}

export interface BulkCreateUnitsInput {
  propertyId: string;
  units: { unitNumber: string; rentAmount: number; unitType?: UnitType }[];
}
