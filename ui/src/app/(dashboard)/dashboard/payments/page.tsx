"use client";

import { useState, useMemo } from 'react';
import {
  Typography,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Card,
  App,
} from 'antd';
import {
  PlusOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { paymentsApi } from '@/lib/api/payments.api';
import { tenantsApi } from '@/lib/api/tenants.api';
import { invoicesApi } from '@/lib/api/invoices.api';
import { parseError } from '@/lib/api/parseError';
import { formatKES } from '@/lib/format-kes';
import type { Payment, RecordPaymentInput, PaymentMethod, PaymentStatus } from '@/types/payments';
import type { Tenant } from '@/types/tenants';
import type { Invoice } from '@/types/invoices';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title } = Typography;

const PAYMENT_STATUS_COLOR_MAP: Record<string, string> = {
  pending: 'orange',
  completed: 'green',
  failed: 'red',
  reversed: 'default',
};

const PAYMENT_STATUS_LABEL_MAP: Record<string, string> = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  reversed: 'Reversed',
};

const PAYMENT_METHOD_LABEL_MAP: Record<string, string> = {
  mpesa_paybill: 'M-Pesa Paybill',
  mpesa_stk_push: 'M-Pesa STK Push',
  wallet_deduction: 'Wallet Deduction',
  manual: 'Manual',
};

const PAYMENT_METHOD_COLOR_MAP: Record<string, string> = {
  mpesa_paybill: 'green',
  mpesa_stk_push: 'cyan',
  wallet_deduction: 'blue',
  manual: 'default',
};

export default function PaymentsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsApi.getAll(),
    enabled: isAuthenticated,
  });

  const payments: Payment[] = Array.isArray(data) ? data : [];

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.getAll(),
    enabled: isModalOpen,
  });

  const tenantsList: Tenant[] = Array.isArray(tenantsData) ? tenantsData : [];

  const { data: tenantInvoicesData } = useQuery({
    queryKey: ['invoices', 'tenant', selectedTenantId, 'unpaid'],
    queryFn: () => invoicesApi.getByTenant(selectedTenantId!),
    enabled: isModalOpen && !!selectedTenantId,
  });

  const tenantInvoices: Invoice[] = useMemo(() => {
    const rawInvoices: Invoice[] = Array.isArray(tenantInvoicesData) ? tenantInvoicesData : [];
    return rawInvoices.filter(
      (inv) => inv.status === 'unpaid' || inv.status === 'partially_paid' || inv.status === 'overdue'
    );
  }, [tenantInvoicesData]);

  const isMpesaMethod = selectedMethod === 'mpesa_paybill' || selectedMethod === 'mpesa_stk_push';

  const recordMutation = useMutation({
    mutationFn: (values: RecordPaymentInput) => paymentsApi.record(values),
    onSuccess: () => {
      message.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsModalOpen(false);
      form.resetFields();
      setSelectedTenantId(undefined);
      setSelectedMethod(undefined);
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to record payment'));
    },
  });

  const handleRecord = async () => {
    try {
      const values = await form.validateFields();
      const payload: RecordPaymentInput = {
        tenantId: values.tenantId,
        invoiceId: values.invoiceId || undefined,
        amount: values.amount,
        method: values.method,
        mpesaReceiptNumber: values.mpesaReceiptNumber || undefined,
        mpesaPhoneNumber: values.mpesaPhoneNumber || undefined,
      };
      recordMutation.mutate(payload);
    } catch {
      // validation errors are shown inline by Ant Design
    }
  };

  const columns: ColumnsType<Payment> = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY, HH:mm') : '-',
      sorter: (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Tenant',
      key: 'tenant',
      render: (_: unknown, record: Payment) => {
        const firstName = record.tenant?.user?.firstName || '';
        const lastName = record.tenant?.user?.lastName || '';
        return `${firstName} ${lastName}`.trim() || '-';
      },
      sorter: (a, b) => {
        const nameA = `${a.tenant?.user?.firstName || ''} ${a.tenant?.user?.lastName || ''}`.trim();
        const nameB = `${b.tenant?.user?.firstName || ''} ${b.tenant?.user?.lastName || ''}`.trim();
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => formatKES(value),
      sorter: (a, b) => a.amount - b.amount,
      align: 'right',
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method: PaymentMethod) => (
        <Tag color={PAYMENT_METHOD_COLOR_MAP[method] || 'default'}>
          {PAYMENT_METHOD_LABEL_MAP[method] || method}
        </Tag>
      ),
      filters: [
        { text: 'M-Pesa Paybill', value: 'mpesa_paybill' },
        { text: 'M-Pesa STK Push', value: 'mpesa_stk_push' },
        { text: 'Wallet Deduction', value: 'wallet_deduction' },
        { text: 'Manual', value: 'manual' },
      ],
      onFilter: (value, record) => record.method === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: PaymentStatus) => (
        <Tag color={PAYMENT_STATUS_COLOR_MAP[status] || 'default'}>
          {PAYMENT_STATUS_LABEL_MAP[status] || status}
        </Tag>
      ),
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Completed', value: 'completed' },
        { text: 'Failed', value: 'failed' },
        { text: 'Reversed', value: 'reversed' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'M-Pesa Receipt #',
      dataIndex: 'mpesaReceiptNumber',
      key: 'mpesaReceiptNumber',
      render: (value: string) => value || '-',
    },
    {
      title: 'Invoice #',
      key: 'invoiceNumber',
      render: (_: unknown, record: Payment) => record.invoice?.invoiceNumber || '-',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <DollarOutlined style={{ marginRight: 8 }} />
          Payments
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Record Payment
        </Button>
      </div>

      <Card>
        <Table<Payment>
          columns={columns}
          dataSource={payments}
          loading={isLoading}
          rowKey="paymentId"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} payments`,
          }}
        />
      </Card>

      <Modal
        title="Record Payment"
        open={isModalOpen}
        onOk={handleRecord}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setSelectedTenantId(undefined);
          setSelectedMethod(undefined);
        }}
        confirmLoading={recordMutation.isPending}
        okText="Record Payment"
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="tenantId"
            label="Tenant"
            rules={[{ required: true, message: 'Please select a tenant' }]}
          >
            <Select
              placeholder="Select a tenant"
              showSearch
              optionFilterProp="label"
              onChange={(value) => {
                setSelectedTenantId(value);
                form.setFieldValue('invoiceId', undefined);
              }}
              options={tenantsList.map((t) => ({
                label: `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim() +
                  (t.unit?.unitNumber ? ` (${t.unit.unitNumber})` : ''),
                value: t.tenantId,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="invoiceId"
            label="Invoice (optional)"
          >
            <Select
              placeholder={selectedTenantId ? 'Select an unpaid invoice' : 'Select a tenant first'}
              allowClear
              disabled={!selectedTenantId}
              options={tenantInvoices.map((inv) => ({
                label: `${inv.invoiceNumber} - Balance: ${formatKES(inv.balanceDue)}`,
                value: inv.invoiceId,
              }))}
              notFoundContent={selectedTenantId ? 'No unpaid invoices' : undefined}
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (KES)"
            rules={[{ required: true, message: 'Please enter the payment amount' }]}
          >
            <InputNumber<number>
              min={1}
              style={{ width: '100%' }}
              placeholder="e.g. 35000"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/,/g, ''))}
            />
          </Form.Item>

          <Form.Item
            name="method"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select a payment method' }]}
          >
            <Select
              placeholder="Select payment method"
              onChange={(value) => setSelectedMethod(value)}
              options={[
                { label: 'Manual', value: 'manual' },
                { label: 'M-Pesa Paybill', value: 'mpesa_paybill' },
              ]}
            />
          </Form.Item>

          {isMpesaMethod && (
            <>
              <Form.Item
                name="mpesaReceiptNumber"
                label="M-Pesa Receipt Number"
                rules={[{ required: true, message: 'Please enter the M-Pesa receipt number' }]}
              >
                <Input placeholder="e.g. SHK7Y8Z9X0" />
              </Form.Item>

              <Form.Item
                name="mpesaPhoneNumber"
                label="M-Pesa Phone Number"
                rules={[
                  { required: true, message: 'Please enter the phone number' },
                  {
                    pattern: /^(?:\+254|0)\d{9}$/,
                    message: 'Please enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678)',
                  },
                ]}
              >
                <Input placeholder="e.g. 0712345678" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
