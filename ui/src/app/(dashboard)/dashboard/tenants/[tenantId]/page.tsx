"use client";

import { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Tag,
  Card,
  Descriptions,
  Modal,
  Form,
  DatePicker,
  Select,
  App,
  Space,
  Spin,
  Empty,
  Tabs,
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  WalletOutlined,
  FileTextOutlined,
  DollarOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { tenantsApi } from '@/lib/api/tenants.api';
import { invoicesApi } from '@/lib/api/invoices.api';
import { paymentsApi, walletApi } from '@/lib/api/payments.api';
import { formatKES } from '@/lib/format-kes';
import type { Tenant, TenantStatus } from '@/types/tenants';
import type { Invoice, InvoiceStatus } from '@/types/invoices';
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/payments';
import type { WalletTransaction, WalletTxnType } from '@/types/payments';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_COLOR_MAP: Record<string, string> = {
  active: 'green',
  notice_period: 'orange',
  vacated: 'red',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: 'Active',
  notice_period: 'Notice Period',
  vacated: 'Vacated',
};

const INVOICE_STATUS_COLOR: Record<string, string> = {
  paid: 'green',
  partially_paid: 'orange',
  unpaid: 'red',
  overdue: 'volcano',
  cancelled: 'default',
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  mpesa_paybill: 'M-Pesa Paybill',
  mpesa_stk_push: 'M-Pesa STK Push',
  wallet_deduction: 'Wallet Deduction',
  manual: 'Manual',
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending: 'orange',
  completed: 'green',
  failed: 'red',
  reversed: 'default',
};

const WALLET_TXN_TYPE_LABEL: Record<string, string> = {
  credit: 'Credit',
  debit_invoice: 'Invoice Deduction',
  debit_penalty: 'Penalty Deduction',
  refund: 'Refund',
};

const WALLET_TXN_TYPE_COLOR: Record<string, string> = {
  credit: 'green',
  debit_invoice: 'red',
  debit_penalty: 'volcano',
  refund: 'blue',
};

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm] = Form.useForm();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => tenantsApi.getOne(tenantId),
    enabled: isAuthenticated && !!tenantId,
  });

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['tenant-invoices', tenantId],
    queryFn: () => invoicesApi.getByTenant(tenantId),
    enabled: isAuthenticated && !!tenantId,
  });

  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['tenant-payments', tenantId],
    queryFn: () => paymentsApi.getByTenant(tenantId),
    enabled: isAuthenticated && !!tenantId,
  });

  const { data: walletTxnsData, isLoading: isLoadingWallet } = useQuery({
    queryKey: ['tenant-wallet-txns', tenantId],
    queryFn: () => walletApi.getTransactions(tenantId),
    enabled: isAuthenticated && !!tenantId,
  });

  const invoices: Invoice[] = Array.isArray(invoicesData) ? invoicesData : [];
  const payments: Payment[] = Array.isArray(paymentsData) ? paymentsData : [];
  const walletTxns: WalletTransaction[] = Array.isArray(walletTxnsData) ? walletTxnsData : [];

  const updateMutation = useMutation({
    mutationFn: (values: Partial<{ leaseEnd: string; status: string }>) =>
      tenantsApi.update(tenantId, values),
    onSuccess: () => {
      message.success('Tenant updated successfully');
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsEditOpen(false);
    },
    onError: () => {
      message.error('Failed to update tenant');
    },
  });

  const vacateMutation = useMutation({
    mutationFn: () => tenantsApi.vacate(tenantId),
    onSuccess: () => {
      message.success('Tenant vacated successfully');
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: () => {
      message.error('Failed to vacate tenant');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tenantsApi.delete(tenantId),
    onSuccess: () => {
      message.success('Tenant and all associated records deleted');
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      router.push('/dashboard/tenants');
    },
    onError: () => {
      message.error('Failed to delete tenant');
    },
  });

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      const payload: Partial<{ leaseEnd: string; status: string }> = {};
      if (values.leaseEnd) payload.leaseEnd = values.leaseEnd.toISOString();
      if (values.status) payload.status = values.status;
      updateMutation.mutate(payload);
    } catch {
      // validation inline
    }
  };

  const openEditModal = () => {
    if (tenant) {
      editForm.setFieldsValue({
        status: tenant.status,
        leaseEnd: tenant.leaseEnd ? dayjs(tenant.leaseEnd) : undefined,
      });
    }
    setIsEditOpen(true);
  };

  const confirmVacate = () => {
    modal.confirm({
      title: 'Vacate Tenant',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to vacate ${tenant?.user?.firstName} ${tenant?.user?.lastName}? This will mark the unit as vacant.`,
      okText: 'Yes, Vacate',
      okType: 'danger',
      onOk: () => vacateMutation.mutate(),
    });
  };

  const confirmDelete = () => {
    modal.confirm({
      title: 'Permanently Delete Tenant',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>
            Are you sure you want to permanently delete <strong>{tenant?.user?.firstName} {tenant?.user?.lastName}</strong>?
          </p>
          <p style={{ color: '#ff4d4f', fontWeight: 600 }}>
            This action cannot be undone. The following will be permanently deleted:
          </p>
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li>All invoices ({invoices.length})</li>
            <li>All payment records ({payments.length})</li>
            <li>All wallet transactions ({walletTxns.length})</li>
            <li>All notifications and maintenance requests</li>
            <li>The tenant record and user account</li>
          </ul>
        </div>
      ),
      okText: 'Yes, Delete Permanently',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(),
    });
  };

  const invoiceColumns: ColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
    },
    {
      title: 'Billing Month',
      dataIndex: 'billingMonth',
      key: 'billingMonth',
      render: (value: string) => value ? dayjs(value).format('MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.billingMonth).getTime() - new Date(b.billingMonth).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (value: number) => formatKES(value),
      align: 'right',
    },
    {
      title: 'Paid',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      render: (value: number) => formatKES(value),
      align: 'right',
    },
    {
      title: 'Balance',
      dataIndex: 'balanceDue',
      key: 'balanceDue',
      render: (value: number) => (
        <Text type={value > 0 ? 'danger' : 'success'}>{formatKES(value)}</Text>
      ),
      align: 'right',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: InvoiceStatus) => (
        <Tag color={INVOICE_STATUS_COLOR[status] || 'default'}>
          {INVOICE_STATUS_LABEL[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
    },
  ];

  const paymentColumns: ColumnsType<Payment> = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
      defaultSortOrder: 'descend',
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
      render: (method: PaymentMethod) => PAYMENT_METHOD_LABEL[method] || method,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: PaymentStatus) => (
        <Tag color={PAYMENT_STATUS_COLOR[status] || 'default'}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'M-Pesa Receipt',
      dataIndex: 'mpesaReceiptNumber',
      key: 'mpesaReceiptNumber',
      render: (value: string) => value || '-',
    },
  ];

  const walletColumns: ColumnsType<WalletTransaction> = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY HH:mm') : '-',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: WalletTxnType) => (
        <Tag color={WALLET_TXN_TYPE_COLOR[type] || 'default'}>
          {WALLET_TXN_TYPE_LABEL[type] || type}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number, record: WalletTransaction) => (
        <Text type={record.type === 'credit' || record.type === 'refund' ? 'success' : 'danger'}>
          {record.type === 'credit' || record.type === 'refund' ? '+' : '-'}{formatKES(value)}
        </Text>
      ),
      align: 'right',
    },
    {
      title: 'Balance After',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (value: number) => formatKES(value),
      align: 'right',
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (value: string) => value || '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (value: string) => value || '-',
      ellipsis: true,
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <Empty description="Tenant not found">
        <Button type="primary" onClick={() => router.push('/dashboard/tenants')}>
          Back to Tenants
        </Button>
      </Empty>
    );
  }

  const fullName = `${tenant.user?.firstName || ''} ${tenant.user?.lastName || ''}`.trim();
  const totalOutstanding = invoices
    .filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + Number(inv.balanceDue), 0);
  const totalPaid = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/dashboard/tenants')}
          />
          <Title level={4} style={{ margin: 0 }}>
            <UserOutlined style={{ marginRight: 8 }} />
            {fullName || 'Tenant'}
          </Title>
          <Tag color={STATUS_COLOR_MAP[tenant.status] || 'default'}>
            {STATUS_LABEL_MAP[tenant.status] || tenant.status}
          </Tag>
        </Space>
        <Space>
          <Button onClick={openEditModal}>Edit</Button>
          {tenant.status !== 'vacated' && (
            <Button danger onClick={confirmVacate} loading={vacateMutation.isPending}>
              Vacate
            </Button>
          )}
          {tenant.status === 'vacated' && (
            <Button
              danger
              type="primary"
              icon={<DeleteOutlined />}
              onClick={confirmDelete}
              loading={deleteMutation.isPending}
            >
              Delete Tenant
            </Button>
          )}
        </Space>
      </div>

      {/* Tenant Details */}
      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, lg: 4 }}>
          <Descriptions.Item label="Email">{tenant.user?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Phone">{tenant.user?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="Property">{tenant.unit?.property?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Unit">{tenant.unit?.unitNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="Rent">{formatKES(tenant.unit?.rentAmount ?? 0)}</Descriptions.Item>
          <Descriptions.Item label="Lease Start">
            {tenant.leaseStart ? dayjs(tenant.leaseStart).format('DD MMM YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Lease End">
            {tenant.leaseEnd ? dayjs(tenant.leaseEnd).format('DD MMM YYYY') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <WalletOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
          <br />
          <Text type="secondary">Wallet Balance</Text>
          <Title level={3} style={{ margin: '4px 0 0', color: '#1890ff' }}>
            {formatKES(tenant.walletBalance ?? 0)}
          </Title>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <FileTextOutlined style={{ fontSize: 24, color: '#fa541c', marginBottom: 8 }} />
          <br />
          <Text type="secondary">Outstanding</Text>
          <Title level={3} style={{ margin: '4px 0 0', color: totalOutstanding > 0 ? '#fa541c' : '#52c41a' }}>
            {formatKES(totalOutstanding)}
          </Title>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <DollarOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
          <br />
          <Text type="secondary">Total Paid</Text>
          <Title level={3} style={{ margin: '4px 0 0', color: '#52c41a' }}>
            {formatKES(totalPaid)}
          </Title>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <FileTextOutlined style={{ fontSize: 24, color: '#722ed1', marginBottom: 8 }} />
          <br />
          <Text type="secondary">Invoices</Text>
          <Title level={3} style={{ margin: '4px 0 0' }}>
            {invoices.length}
          </Title>
        </Card>
      </div>

      {/* Tabs for Invoices, Payments, Wallet */}
      <Card>
        <Tabs
          defaultActiveKey="invoices"
          items={[
            {
              key: 'invoices',
              label: `Invoices (${invoices.length})`,
              children: (
                <Table<Invoice>
                  columns={invoiceColumns}
                  dataSource={invoices}
                  loading={isLoadingInvoices}
                  rowKey="invoiceId"
                  pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                  }}
                  locale={{ emptyText: <Empty description="No invoices yet" /> }}
                />
              ),
            },
            {
              key: 'payments',
              label: `Payments (${payments.length})`,
              children: (
                <Table<Payment>
                  columns={paymentColumns}
                  dataSource={payments}
                  loading={isLoadingPayments}
                  rowKey="paymentId"
                  pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                  }}
                  locale={{ emptyText: <Empty description="No payments yet" /> }}
                />
              ),
            },
            {
              key: 'wallet',
              label: 'Wallet History',
              children: (
                <Table<WalletTransaction>
                  columns={walletColumns}
                  dataSource={walletTxns}
                  loading={isLoadingWallet}
                  rowKey="walletTransactionId"
                  pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                  }}
                  locale={{ emptyText: <Empty description="No wallet transactions yet" /> }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Edit Tenant Modal */}
      <Modal
        title="Edit Tenant"
        open={isEditOpen}
        onOk={handleEdit}
        onCancel={() => setIsEditOpen(false)}
        confirmLoading={updateMutation.isPending}
        okText="Save Changes"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="status" label="Status">
            <Select
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Notice Period', value: 'notice_period' },
                { label: 'Vacated', value: 'vacated' },
              ]}
            />
          </Form.Item>
          <Form.Item name="leaseEnd" label="Lease End Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
