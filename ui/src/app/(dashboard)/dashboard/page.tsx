"use client";

import { Card, Col, Row, Statistic, Typography, Table, Tag, Progress } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  FileTextOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, type DashboardStats } from '@/lib/api/dashboard.api';
import { formatKES } from '@/lib/format-kes';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

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

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Overview</Title>
        <Text type="secondary">Welcome to RentFlow property management</Text>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Properties"
              value={stats?.totalProperties ?? 0}
              prefix={<HomeOutlined />}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  ({stats?.occupiedUnits ?? 0}/{stats?.totalUnits ?? 0} units)
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Active Tenants"
              value={stats?.activeTenants ?? 0}
              prefix={<TeamOutlined />}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  of {stats?.totalTenants ?? 0}
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Revenue"
              value={stats?.totalRevenue ?? 0}
              prefix={<DollarOutlined />}
              formatter={(value) => formatKES(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Outstanding"
              value={stats?.outstandingBalance ?? 0}
              prefix={<WarningOutlined />}
              formatter={(value) => formatKES(Number(value))}
              valueStyle={{ color: (stats?.outstandingBalance ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Occupancy & Collection Rates */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Occupancy Rate</Text>
              <Progress
                type="circle"
                percent={Math.round(stats?.occupancyRate ?? 0)}
                size={80}
                strokeColor="#1890ff"
                style={{ marginTop: 8 }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Collection Rate</Text>
              <Progress
                type="circle"
                percent={Math.round(stats?.collectionRate ?? 0)}
                size={80}
                strokeColor={
                  (stats?.collectionRate ?? 0) >= 80 ? '#52c41a' :
                  (stats?.collectionRate ?? 0) >= 50 ? '#faad14' : '#ff4d4f'
                }
                style={{ marginTop: 8 }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Total Expenses"
              value={stats?.totalExpenses ?? 0}
              formatter={(value) => formatKES(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Overdue Invoices"
              value={stats?.overdueInvoices ?? 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: (stats?.overdueInvoices ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Activity Tables */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Recent Invoices" loading={isLoading}>
            {(stats?.recentInvoices?.length ?? 0) > 0 ? (
              <Table
                columns={invoiceColumns}
                dataSource={stats?.recentInvoices}
                rowKey="invoiceId"
                pagination={false}
                size="small"
              />
            ) : (
              <Text type="secondary">No invoices yet. Set up properties and tenants to get started.</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Recent Payments" loading={isLoading}>
            {(stats?.recentPayments?.length ?? 0) > 0 ? (
              <Table
                columns={paymentColumns}
                dataSource={stats?.recentPayments}
                rowKey="paymentId"
                pagination={false}
                size="small"
              />
            ) : (
              <Text type="secondary">No payments recorded yet.</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
