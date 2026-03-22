"use client";

import { Card, Col, Row, Statistic, Typography, Table, Tag, Progress, Grid } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  FileTextOutlined,
  DollarOutlined,
  WarningOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, type DashboardStats } from '@/lib/api/dashboard.api';
import { formatKES } from '@/lib/format-kes';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const STATUS_COLOR_MAP: Record<string, string> = {
  paid: 'green',
  partially_paid: 'blue',
  unpaid: 'orange',
  overdue: 'red',
  cancelled: 'default',
  completed: 'green',
  pending: 'orange',
  failed: 'red',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
};

const METHOD_LABEL_MAP: Record<string, string> = {
  mpesa_paybill: 'M-Pesa',
  mpesa_stk_push: 'STK Push',
  wallet_deduction: 'Wallet',
  manual: 'Manual',
};

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
    enabled: isAuthenticated,
  });

  const invoiceColumns: ColumnsType<NonNullable<DashboardStats['recentInvoices']>[0]> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
    },
    {
      title: 'Tenant',
      key: 'tenant',
      render: (_: unknown, record) => {
        const name = `${record.tenant?.user?.firstName || ''} ${record.tenant?.user?.lastName || ''}`.trim();
        return name || '-';
      },
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (value: number) => formatKES(value),
      align: 'right',
    },
    {
      title: 'Balance',
      dataIndex: 'balanceDue',
      key: 'balanceDue',
      render: (value: number) => formatKES(value),
      align: 'right',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLOR_MAP[status] || 'default'}>
          {STATUS_LABEL_MAP[status] || status}
        </Tag>
      ),
    },
  ];

  const maintenanceColumns: ColumnsType<NonNullable<DashboardStats['recentMaintenance']>[0]> = [
    {
      title: 'Property',
      key: 'property',
      render: (_: unknown, record) => record.tenant?.unit?.property?.name || '-',
    },
    {
      title: 'Unit',
      key: 'unit',
      render: (_: unknown, record) => record.tenant?.unit?.unitNumber || '-',
    },
    {
      title: 'Tenant',
      key: 'tenant',
      render: (_: unknown, record) => {
        const name = `${record.tenant?.user?.firstName || ''} ${record.tenant?.user?.lastName || ''}`.trim();
        return name || '-';
      },
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (val: string) => val?.replace(/_/g, ' ') || '-',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => {
        const colorMap: Record<string, string> = { low: 'default', medium: 'blue', high: 'orange', urgent: 'red' };
        return <Tag color={colorMap[priority] || 'default'}>{priority?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLOR_MAP[status] || 'default'}>
          {STATUS_LABEL_MAP[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM') : '-',
    },
  ];

  const paymentColumns: ColumnsType<NonNullable<DashboardStats['recentPayments']>[0]> = [
    {
      title: 'Tenant',
      key: 'tenant',
      render: (_: unknown, record) => {
        const name = `${record.tenant?.user?.firstName || ''} ${record.tenant?.user?.lastName || ''}`.trim();
        return name || '-';
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => formatKES(value),
      align: 'right',
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => METHOD_LABEL_MAP[method] || method,
    },
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM') : '-',
    },
  ];

  const renderMobileInvoiceCard = (inv: NonNullable<DashboardStats['recentInvoices']>[0]) => {
    const tenantName = `${inv.tenant?.user?.firstName || ''} ${inv.tenant?.user?.lastName || ''}`.trim() || '-';
    return (
      <div key={inv.invoiceId} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>{inv.invoiceNumber}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{tenantName}</Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text strong style={{ fontSize: 13, display: 'block' }}>{formatKES(inv.totalAmount)}</Text>
            <Tag color={STATUS_COLOR_MAP[inv.status] || 'default'} style={{ margin: 0, fontSize: 10 }}>
              {STATUS_LABEL_MAP[inv.status] || inv.status}
            </Tag>
          </div>
        </div>
        {Number(inv.balanceDue) > 0 && (
          <Text type="secondary" style={{ fontSize: 11 }}>Balance: {formatKES(inv.balanceDue)}</Text>
        )}
      </div>
    );
  };

  const renderMobilePaymentCard = (p: NonNullable<DashboardStats['recentPayments']>[0]) => {
    const tenantName = `${p.tenant?.user?.firstName || ''} ${p.tenant?.user?.lastName || ''}`.trim() || '-';
    return (
      <div key={p.paymentId} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>{tenantName}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {METHOD_LABEL_MAP[p.method] || p.method} · {p.transactionDate ? dayjs(p.transactionDate).format('DD MMM') : '-'}
            </Text>
          </div>
          <Text strong style={{ fontSize: 14, color: '#52c41a' }}>{formatKES(p.amount)}</Text>
        </div>
      </div>
    );
  };

  const renderMobileMaintenanceCard = (m: NonNullable<DashboardStats['recentMaintenance']>[0]) => {
    const tenantName = `${m.tenant?.user?.firstName || ''} ${m.tenant?.user?.lastName || ''}`.trim() || '-';
    const unit = m.tenant?.unit?.unitNumber || '-';
    const priorityColor: Record<string, string> = { low: 'default', medium: 'blue', high: 'orange', urgent: 'red' };
    return (
      <div key={m.maintenanceRequestId} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>{unit} — {tenantName}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{m.category?.replace(/_/g, ' ') || '-'}</Text>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Tag color={priorityColor[m.priority] || 'default'} style={{ margin: 0, fontSize: 10 }}>
              {m.priority?.toUpperCase()}
            </Tag>
            <Tag color={STATUS_COLOR_MAP[m.status] || 'default'} style={{ margin: 0, fontSize: 10 }}>
              {STATUS_LABEL_MAP[m.status] || m.status}
            </Tag>
          </div>
        </div>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {m.createdAt ? dayjs(m.createdAt).format('DD MMM YYYY') : '-'}
        </Text>
      </div>
    );
  };

  const gutter: [number, number] = isMobile ? [8, 8] : [16, 16];

  return (
    <div>
      <div style={{ marginBottom: isMobile ? 12 : 24 }}>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>Overview</Title>
        <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Welcome to RentFlow property management</Text>
      </div>

      {/* KPI Cards */}
      <Row gutter={gutter}>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Properties</Text>}
              value={stats?.totalProperties ?? 0}
              prefix={<HomeOutlined />}
              valueStyle={{ fontSize: isMobile ? 18 : 24 }}
              suffix={
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>
                  ({stats?.occupiedUnits ?? 0}/{stats?.totalUnits ?? 0})
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Active Tenants</Text>}
              value={stats?.activeTenants ?? 0}
              prefix={<TeamOutlined />}
              valueStyle={{ fontSize: isMobile ? 18 : 24 }}
              suffix={
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>
                  of {stats?.totalTenants ?? 0}
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Revenue</Text>}
              value={stats?.totalRevenue ?? 0}
              prefix={<DollarOutlined />}
              formatter={(value) => formatKES(Number(value))}
              valueStyle={{ fontSize: isMobile ? 16 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Outstanding</Text>}
              value={stats?.outstandingBalance ?? 0}
              prefix={<WarningOutlined />}
              formatter={(value) => formatKES(Number(value))}
              valueStyle={{ fontSize: isMobile ? 16 : 24, color: (stats?.outstandingBalance ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Occupancy & Collection Rates */}
      <Row gutter={gutter} style={{ marginTop: isMobile ? 8 : 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Occupancy Rate</Text>
              <Progress
                type="circle"
                percent={Math.round(stats?.occupancyRate ?? 0)}
                size={isMobile ? 60 : 80}
                strokeColor="#1890ff"
                style={{ marginTop: 8 }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Collection Rate</Text>
              <Progress
                type="circle"
                percent={Math.round(stats?.collectionRate ?? 0)}
                size={isMobile ? 60 : 80}
                strokeColor={
                  (stats?.collectionRate ?? 0) >= 80 ? '#52c41a' :
                  (stats?.collectionRate ?? 0) >= 50 ? '#faad14' : '#ff4d4f'
                }
                style={{ marginTop: 8 }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Total Expenses</Text>}
              value={stats?.totalExpenses ?? 0}
              formatter={(value) => formatKES(Number(value))}
              valueStyle={{ fontSize: isMobile ? 16 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Overdue Invoices</Text>}
              value={stats?.overdueInvoices ?? 0}
              prefix={<WarningOutlined />}
              valueStyle={{ fontSize: isMobile ? 18 : 24, color: (stats?.overdueInvoices ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Maintenance KPI */}
      <Row gutter={gutter} style={{ marginTop: isMobile ? 8 : 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Pending Maint.</Text>}
              value={stats?.pendingMaintenance ?? 0}
              prefix={<AlertOutlined />}
              valueStyle={{ fontSize: isMobile ? 18 : 24, color: (stats?.pendingMaintenance ?? 0) > 0 ? '#fa8c16' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Urgent Maint.</Text>}
              value={stats?.urgentMaintenance ?? 0}
              prefix={<WarningOutlined />}
              valueStyle={{ fontSize: isMobile ? 18 : 24, color: (stats?.urgentMaintenance ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row gutter={gutter} style={{ marginTop: isMobile ? 12 : 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Recent Invoices</Text>}
            loading={isLoading}
            size={isMobile ? 'small' : 'default'}
            style={{ marginBottom: isMobile ? 8 : 0 }}
          >
            {(stats?.recentInvoices?.length ?? 0) > 0 ? (
              isMobile ? (
                stats!.recentInvoices!.map(renderMobileInvoiceCard)
              ) : (
                <Table
                  columns={invoiceColumns}
                  dataSource={stats?.recentInvoices}
                  rowKey="invoiceId"
                  pagination={false}
                  size="small"
                />
              )
            ) : (
              <Text type="secondary">No invoices yet. Set up properties and tenants to get started.</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Recent Payments</Text>}
            loading={isLoading}
            size={isMobile ? 'small' : 'default'}
          >
            {(stats?.recentPayments?.length ?? 0) > 0 ? (
              isMobile ? (
                stats!.recentPayments!.map(renderMobilePaymentCard)
              ) : (
                <Table
                  columns={paymentColumns}
                  dataSource={stats?.recentPayments}
                  rowKey="paymentId"
                  pagination={false}
                  size="small"
                />
              )
            ) : (
              <Text type="secondary">No payments recorded yet.</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Recent Maintenance */}
      <Row gutter={gutter} style={{ marginTop: isMobile ? 8 : 16 }}>
        <Col xs={24}>
          <Card
            title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Recent Maintenance</Text>}
            loading={isLoading}
            size={isMobile ? 'small' : 'default'}
          >
            {(stats?.recentMaintenance?.length ?? 0) > 0 ? (
              isMobile ? (
                stats!.recentMaintenance!.map(renderMobileMaintenanceCard)
              ) : (
                <Table
                  columns={maintenanceColumns}
                  dataSource={stats?.recentMaintenance}
                  rowKey="maintenanceRequestId"
                  pagination={false}
                  size="small"
                />
              )
            ) : (
              <Text type="secondary">No maintenance requests yet.</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
