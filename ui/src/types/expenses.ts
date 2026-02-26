export type ExpenseCategory =
  | 'plumbing'
  | 'roofing'
  | 'electrical'
  | 'painting'
  | 'security'
  | 'general_maintenance'
  | 'structural'
  | 'other';

export type ExpenseStatus =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ExpensePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Expense {
  expenseId: string;
  propertyId: string;
  category: ExpenseCategory;
  priority: ExpensePriority;
  description: string;
  amount: number;
  vendorId?: string;
  status: ExpenseStatus;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
  property?: {
    propertyId: string;
    name: string;
    location: string;
  };
  vendor?: {
    vendorId: string;
    name: string;
    phone: string;
    specialty: string;
  };
}

export interface CreateExpenseInput {
  propertyId: string;
  category: ExpenseCategory;
  priority?: ExpensePriority;
  description: string;
  amount: number;
  vendorId?: string;
  scheduledDate?: string;
  notes?: string;
}

export interface UpdateExpenseInput {
  category?: ExpenseCategory;
  priority?: ExpensePriority;
  description?: string;
  amount?: number;
  vendorId?: string;
  status?: ExpenseStatus;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
}

export interface Vendor {
  vendorId: string;
  name: string;
  phone: string;
  email?: string;
  specialty: string;
  rating?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorInput {
  name: string;
  phone: string;
  email?: string;
  specialty: string;
}

export interface UpdateVendorInput {
  name?: string;
  phone?: string;
  email?: string;
  specialty?: string;
  rating?: number;
  isActive?: boolean;
}

export interface MaintenanceRequest {
  maintenanceRequestId: string;
  tenantId?: string | null;
  propertyId?: string | null;
  description: string;
  category: ExpenseCategory;
  priority: ExpensePriority;
  photos?: string[];
  status: ExpenseStatus;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  tenant?: {
    tenantId: string;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
    unit?: {
      unitNumber: string;
      property?: {
        propertyId: string;
        name: string;
        location: string;
      };
    };
  };
  property?: {
    propertyId: string;
    name: string;
    location: string;
  };
}

export interface CreateMaintenanceRequestInput {
  tenantId?: string;
  propertyId?: string;
  description: string;
  category: ExpenseCategory;
  priority?: ExpensePriority;
}

export interface UpdateMaintenanceRequestInput {
  status?: ExpenseStatus;
  priority?: ExpensePriority;
  notes?: string;
  resolvedAt?: string;
  expenseAmount?: number;
}
