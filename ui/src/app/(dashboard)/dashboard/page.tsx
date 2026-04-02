"use client";

import { Card, Col, Row, Statistic, Typography, Table, Tag, Grid } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  WarningOutlined,
  AlertOutlined,
  DollarOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, type DashboardStats } from '@/lib/api/dashboard.api';
import { formatKES } from '@/lib/format-kes';
import RevenueCharts from './components/revenue-charts';
import LeaseExpiringTable from './components/lease-expiring-table';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import Link from 'next/link';

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
      dataIndex: 'tenantName',
      key: 'tenantName',
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
      dataIndex: 'tenantName',
      key: 'tenantName',
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
    const tenantName = inv.tenantName || '-';
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
    const tenantName = p.tenantName || '-';
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

  const occupancyRate = Math.round(stats?.occupancyRate ?? 0);
  const collectionRate = Math.round(stats?.collectionRate ?? 0);

  return (
    <div>
      <div style={{ marginBottom: isMobile ? 12 : 24 }}>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>Overview</Title>
        <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Welcome to RentFlow property management</Text>
      </div>

      {/* Row 1: 4 Primary KPIs */}
      <Row gutter={gutter}>
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
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Occupancy</Text>}
              value={occupancyRate}
              suffix="%"
              valueStyle={{
                fontSize: isMobile ? 18 : 24,
                color: occupancyRate >= 80 ? '#3f8600' : occupancyRate >= 50 ? '#fa8c16' : '#cf1322',
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={isMobile ? { body: { padding: 12 } } : undefined}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Collection Rate</Text>}
              value={collectionRate}
              suffix="%"
              valueStyle={{
                fontSize: isMobile ? 18 : 24,
                color: collectionRate >= 80 ? '#3f8600' : collectionRate >= 50 ? '#fa8c16' : '#cf1322',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Row 2: Quick Stats Bar */}
      <Row gutter={gutter} style={{ marginTop: isMobile ? 8 : 16 }}>
        <Col xs={24}>
          <Card loading={isLoading} size={isMobile ? 'small' : 'default'} styles={{ body: { padding: isMobile ? '8px 12px' : '12px 24px' } }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: isMobile ? 12 : 24,
              justifyContent: 'space-between',
            }}>
              <div style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                <HomeOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>Properties: </Text>
                <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>
                  {stats?.totalProperties ?? 0}
                </Text>
                <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12, marginLeft: 4 }}>
                  ({stats?.occupiedUnits ?? 0}/{stats?.totalUnits ?? 0} units)
                </Text>
              </div>
              <div style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                <TeamOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>Active Tenants: </Text>
                <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>
                  {stats?.activeTenants ?? 0}
                </Text>
                <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12, marginLeft: 4 }}>
                  of {stats?.totalTenants ?? 0}
                </Text>
              </div>
              <div style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                <WarningOutlined style={{ marginRight: 6, color: (stats?.overdueInvoices ?? 0) > 0 ? '#cf1322' : '#52c41a' }} />
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>Overdue: </Text>
                <Text strong style={{
                  fontSize: isMobile ? 12 : 14,
                  color: (stats?.overdueInvoices ?? 0) > 0 ? '#cf1322' : undefined,
                }}>
                  {stats?.overdueInvoices ?? 0}
                </Text>
              </div>
              <div style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                <DollarOutlined style={{ marginRight: 6, color: '#fa8c16' }} />
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>Expenses: </Text>
                <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>
                  {formatKES(stats?.totalExpenses ?? 0)}
                </Text>
              </div>
              <div style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                <ToolOutlined style={{ marginRight: 6, color: (stats?.pendingMaintenance ?? 0) > 0 ? '#fa8c16' : '#52c41a' }} />
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>Pending Maint.: </Text>
                <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>
                  {stats?.pendingMaintenance ?? 0}
                </Text>
              </div>
              <div style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                <AlertOutlined style={{ marginRight: 6, color: (stats?.urgentMaintenance ?? 0) > 0 ? '#cf1322' : '#52c41a' }} />
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>Urgent Maint.: </Text>
                <Text strong style={{
                  fontSize: isMobile ? 12 : 14,
                  color: (stats?.urgentMaintenance ?? 0) > 0 ? '#cf1322' : undefined,
                }}>
                  {stats?.urgentMaintenance ?? 0}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Revenue Charts (moved up) */}
      <Row gutter={gutter} style={{ marginTop: isMobile ? 12 : 24 }}>
        <Col xs={24}>
          <RevenueCharts />
        </Col>
      </Row>

      {/* Row 4: Recent Activity */}
      <Row gutter={gutter} style={{ marginTop: isMobile ? 12 : 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Recent Invoices</Text>}
            extra={<Link href="/dashboard/invoices"><Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>View All</Text></Link>}
            loading={isLoading}
            size={isMobile ? 'small' : 'default'}
            style={{ marginBottom: isMobile ? 8 : 16 }}
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
            extra={<Link href="/dashboard/payments"><Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>View All</Text></Link>}
            loading={isLoading}
            size={isMobile ? 'small' : 'default'}
            style={{ marginBottom: isMobile ? 8 : 16 }}
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

      <Row gutter={gutter}>
        <Col xs={24} lg={12}>
          <Card
            title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Recent Maintenance</Text>}
            extra={<Link href="/dashboard/maintenance"><Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>View All</Text></Link>}
            loading={isLoading}
            size={isMobile ? 'small' : 'default'}
            style={{ marginBottom: isMobile ? 8 : 16 }}
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
        <Col xs={24} lg={12}>
          <LeaseExpiringTable />
        </Col>
      </Row>
    </div>
  );
}
