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
    tenantName: string;
  }>;
  recentInvoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    totalAmount: number;
    balanceDue: number;
    status: string;
    dueDate: string;
    tenantName: string;
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

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  target: number;
}

export interface CollectionRate {
  month: string;
  rate: number;
}

export interface RevenueByProperty {
  property: string;
  revenue: number;
}

export interface RevenueAnalytics {
  monthlyRevenue: MonthlyRevenue[];
  collectionRate: CollectionRate[];
  revenueByProperty: RevenueByProperty[];
}

export interface AgingBucket {
  bucket: string;
  count: number;
  totalAmount: number;
}

export interface AgingDetail {
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  invoiceNumber: string;
  dueDate: string;
  balanceDue: number;
  ageDays: number;
  bucket: string;
}

export interface AgingReport {
  summary: AgingBucket[];
  details: AgingDetail[];
}

export interface PropertyPnlItem {
  propertyId: string;
  propertyName: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  occupancyRate: number;
  unitCount: number;
}

export interface PropertyPnlReport {
  properties: PropertyPnlItem[];
  totals: { revenue: number; expenses: number; netIncome: number };
}

export interface ExpiringLease {
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  leaseEnd: string;
  status: string;
  daysRemaining: number;
}

export interface CashFlowMonth {
  month: string;
  expectedRevenue: number;
  projectedCollection: number;
  projectedExpenses: number;
  projectedNet: number;
}

export interface CashFlowForecast {
  months: CashFlowMonth[];
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
  getAnalytics: async (months?: number): Promise<RevenueAnalytics> => {
    const response = await api.get('/dashboard/analytics', { params: { months } });
    return response.data;
  },
  getAgingReport: async (): Promise<AgingReport> => {
    const response = await api.get('/dashboard/aging-report');
    return response.data;
  },
  getPropertyPnl: async (startDate?: string, endDate?: string): Promise<PropertyPnlReport> => {
    const response = await api.get('/dashboard/property-pnl', { params: { startDate, endDate } });
    return response.data;
  },
  getExpiringLeases: async (withinDays?: number): Promise<ExpiringLease[]> => {
    const response = await api.get('/dashboard/expiring-leases', { params: { withinDays } });
    return response.data;
  },
  getCashFlowForecast: async (months?: number): Promise<CashFlowForecast> => {
    const response = await api.get('/dashboard/cash-flow-forecast', { params: { months } });
    return response.data;
  },
};
