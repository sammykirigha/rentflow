import api from '.';

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  totalTenants: number;
  activeTenants: number;
  totalRevenue: number;
  outstandingBalance: number;
  collectionRate: number;
  totalExpenses: number;
  overdueInvoices: number;
  pendingMaintenance: number;
  urgentMaintenance: number;
  recentPayments: Array<{
    paymentId: string;
    amount: number;
    method: string;
    status: string;
    transactionDate: string;
    tenant?: {
      user?: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
  recentInvoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    totalAmount: number;
    balanceDue: number;
    status: string;
    dueDate: string;
    tenant?: {
      user?: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
  recentMaintenance: Array<{
    maintenanceRequestId: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    tenant?: {
      user?: {
        firstName: string;
        lastName: string;
      };
      unit?: {
        unitNumber: string;
        property?: {
          name: string;
        };
      };
    };
  }>;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
};
