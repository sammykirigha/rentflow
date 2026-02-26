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
  Tabs,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  DollarOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { paymentsApi } from '@/lib/api/payments.api';
import { tenantsApi } from '@/lib/api/tenants.api';
import { propertiesApi } from '@/lib/api/properties.api';
import { parseError } from '@/lib/api/parseError';
import { formatKES } from '@/lib/format-kes';
import {
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_COLOR,
} from '@/lib/constants/status-maps';
import TenantReconcilePreview from '@/components/payments/TenantReconcilePreview';
import type { Payment, RecordPaymentInput, PaymentMethod, PaymentStatus } from '@/types/payments';
import type { Tenant } from '@/types/tenants';
import type { Property } from '@/types/properties';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title } = Typography;


export default function PaymentsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [selectedPaymentForReconcile, setSelectedPaymentForReconcile] = useState<Payment | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reconPage, setReconPage] = useState(1);
  const [reconPageSize, setReconPageSize] = useState(10);
  const [form] = Form.useForm();
  const [reconcileForm] = Form.useForm();
  const reconSelectedTenantId = Form.useWatch('targetTenantId', reconcileForm);

  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, pageSize],
    queryFn: () => paymentsApi.getAll({ page, limit: pageSize }),
    enabled: isAuthenticated,
  });

  const payments: Payment[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  // Reconciliation queue query
  const { data: reconData, isLoading: reconLoading } = useQuery({
    queryKey: ['payments', 'reconciliation-queue', reconPage, reconPageSize],
    queryFn: () => paymentsApi.getReconciliationQueue({ page: reconPage, limit: reconPageSize }),
    enabled: isAuthenticated,
  });

  const reconPayments: Payment[] = Array.isArray(reconData?.data) ? reconData.data : [];
  const reconPagination = reconData?.pagination;

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants', 'all'],
    queryFn: () => tenantsApi.getAll({ limit: 200 }),
    enabled: isModalOpen || isReconcileModalOpen,
  });

  const tenantsList: Tenant[] = Array.isArray(tenantsData?.data) ? tenantsData.data : [];

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'all'],
    queryFn: () => propertiesApi.getAll({ limit: 200 }),
    enabled: isReconcileModalOpen,
  });

  const propertiesList: Property[] = Array.isArray(propertiesData?.data) ? propertiesData.data : [];

  // Match paybill number to property
  const matchedProperty = useMemo(() => {
    if (!selectedPaymentForReconcile?.mpesaPaybillNumber) return null;
    return propertiesList.find(
      (p) => p.paybillNumber === selectedPaymentForReconcile.mpesaPaybillNumber,
    ) || null;
  }, [selectedPaymentForReconcile, propertiesList]);

  // Normalize phone: strip leading + and leading 0, convert to 254 prefix for comparison
  const normalizePhone = (phone: string): string => {
    let cleaned = phone.replace(/\s+/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
    return cleaned;
  };

  // Match phone number to tenant
  const matchedTenant = useMemo(() => {
    if (!selectedPaymentForReconcile?.mpesaPhoneNumber || tenantsList.length === 0) return null;
    const paymentPhone = normalizePhone(selectedPaymentForReconcile.mpesaPhoneNumber);
    return tenantsList.find((t) => {
      if (!t.user?.phone) return false;
      return normalizePhone(t.user.phone) === paymentPhone;
    }) || null;
  }, [selectedPaymentForReconcile, tenantsList]);

  const isMpesaMethod = selectedMethod === 'mpesa_paybill' || selectedMethod === 'mpesa_stk_push';

  const recordMutation = useMutation({
    mutationFn: (values: RecordPaymentInput) => paymentsApi.record(values),
    onSuccess: () => {
      message.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setIsModalOpen(false);
      form.resetFields();
      setSelectedMethod(undefined);
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to record payment'));
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: (values: { paymentId: string; targetTenantId: string; note?: string }) =>
      paymentsApi.reconcilePayment(values.paymentId, {
        targetTenantId: values.targetTenantId,
        note: values.note,
      }),
    onSuccess: () => {
      message.success('Payment reconciled successfully');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setIsReconcileModalOpen(false);
      setSelectedPaymentForReconcile(null);
      reconcileForm.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to reconcile payment'));
    },
  });

  const handleRecord = async () => {
    try {
      const values = await form.validateFields();
      const payload: RecordPaymentInput = {
        tenantId: values.tenantId,
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

  const handleReconcile = async () => {
    try {
      const values = await reconcileForm.validateFields();
      if (!selectedPaymentForReconcile) return;
      reconcileMutation.mutate({
        paymentId: selectedPaymentForReconcile.paymentId,
        targetTenantId: values.targetTenantId,
        note: values.note || undefined,
      });
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
        <Tag color={PAYMENT_METHOD_COLOR[method] || 'default'}>
          {PAYMENT_METHOD_LABEL[method] || method}
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
        <Tag color={PAYMENT_STATUS_COLOR[status] || 'default'}>
          {PAYMENT_STATUS_LABEL[status] || status}
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

  const reconciliationColumns: ColumnsType<Payment> = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY, HH:mm') : '-',
      sorter: (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'M-Pesa Receipt #',
      dataIndex: 'mpesaReceiptNumber',
      key: 'mpesaReceiptNumber',
      render: (value: string) => value || '-',
    },
    {
      title: 'Phone Number',
      dataIndex: 'mpesaPhoneNumber',
      key: 'mpesaPhoneNumber',
      render: (value: string) => value || '-',
    },
    {
      title: 'Paybill',
      dataIndex: 'mpesaPaybillNumber',
      key: 'mpesaPaybillNumber',
      render: (value: string) => value || '-',
    },
    {
      title: 'Account Ref',
      dataIndex: 'mpesaAccountReference',
      key: 'mpesaAccountReference',
      render: (value: string) => value || '-',
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
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Payment) => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            setSelectedPaymentForReconcile(record);
            setIsReconcileModalOpen(true);
            // Auto-select tenant by phone match after tenants load
            if (record.mpesaPhoneNumber) {
              const paymentPhone = normalizePhone(record.mpesaPhoneNumber);
              const matched = tenantsList.find((t) =>
                t.user?.phone ? normalizePhone(t.user.phone) === paymentPhone : false,
              );
              if (matched) {
                setTimeout(() => reconcileForm.setFieldValue('targetTenantId', matched.tenantId), 0);
              }
            }
          }}
        >
          Reconcile
        </Button>
      ),
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
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          items={[
            {
              key: 'all',
              label: 'All Payments',
              children: (
                <Table<Payment>
                  columns={columns}
                  dataSource={payments}
                  loading={isLoading}
                  rowKey="paymentId"
                  pagination={{
                    current: page,
                    pageSize,
                    total: pagination?.total || 0,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} payments`,
                    onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                  }}
                />
              ),
            },
            {
              key: 'reconciliation',
              label: (
                <Badge count={reconPagination?.total || 0} size="small" offset={[8, 0]}>
                  <span><WarningOutlined style={{ marginRight: 4 }} />Reconciliation</span>
                </Badge>
              ),
              children: (
                <Table<Payment>
                  columns={reconciliationColumns}
                  dataSource={reconPayments}
                  loading={reconLoading}
                  rowKey="paymentId"
                  locale={{ emptyText: 'No payments need reconciliation' }}
                  pagination={{
                    current: reconPage,
                    pageSize: reconPageSize,
                    total: reconPagination?.total || 0,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} payments`,
                    onChange: (p, ps) => { setReconPage(p); setReconPageSize(ps); },
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Record Payment Modal */}
      <Modal
        title="Record Payment"
        open={isModalOpen}
        onOk={handleRecord}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
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
              options={tenantsList.map((t) => ({
                label: `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim() +
                  (t.unit?.unitNumber ? ` (${t.unit.unitNumber})` : ''),
                value: t.tenantId,
              }))}
            />
          </Form.Item>

          <div style={{ marginBottom: 16, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 13, color: '#595959' }}>
            The payment amount will be credited to the tenant&apos;s wallet and automatically applied to their oldest unpaid invoices.
          </div>

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

      {/* Reconcile Payment Modal */}
      <Modal
        title="Reconcile Payment"
        open={isReconcileModalOpen}
        onOk={handleReconcile}
        onCancel={() => {
          setIsReconcileModalOpen(false);
          setSelectedPaymentForReconcile(null);
          reconcileForm.resetFields();
        }}
        confirmLoading={reconcileMutation.isPending}
        okText="Reconcile"
        width={1100}
      >
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Left column: payment details + form */}
          <div style={{ width: 440, flexShrink: 0 }}>
            {selectedPaymentForReconcile && (
              <>
                <div style={{ marginBottom: 12, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                  <p style={{ margin: '0 0 4px' }}>
                    <strong>M-Pesa Receipt:</strong> {selectedPaymentForReconcile.mpesaReceiptNumber || '-'}
                  </p>
                  <p style={{ margin: '0 0 4px' }}>
                    <strong>Phone:</strong> {selectedPaymentForReconcile.mpesaPhoneNumber || '-'}
                    {matchedTenant && (
                      <Tag color="green" style={{ marginLeft: 8 }}>
                        {`${matchedTenant.user?.firstName || ''} ${matchedTenant.user?.lastName || ''}`.trim()}
                        {matchedTenant.unit?.unitNumber ? ` (${matchedTenant.unit.unitNumber})` : ''}
                      </Tag>
                    )}
                  </p>
                  <p style={{ margin: '0 0 4px' }}>
                    <strong>Paybill:</strong> {selectedPaymentForReconcile.mpesaPaybillNumber || '-'}
                    {matchedProperty && (
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        {matchedProperty.name}
                      </Tag>
                    )}
                  </p>
                  <p style={{ margin: '0 0 4px' }}>
                    <strong>Account Ref:</strong> {selectedPaymentForReconcile.mpesaAccountReference || '-'}
                  </p>
                  <p style={{ margin: '0 0 4px' }}>
                    <strong>Amount:</strong> {formatKES(selectedPaymentForReconcile.amount)}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Date:</strong> {dayjs(selectedPaymentForReconcile.transactionDate).format('DD MMM YYYY, HH:mm')}
                  </p>
                </div>
                {matchedTenant && (
                  <div style={{ marginBottom: 12, padding: 8, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                    <strong>Suggested tenant:</strong>{' '}
                    {`${matchedTenant.user?.firstName || ''} ${matchedTenant.user?.lastName || ''}`.trim()}
                    {matchedTenant.unit?.unitNumber ? ` — Unit ${matchedTenant.unit.unitNumber}` : ''}
                    {matchedTenant.unit?.property?.name ? ` (${matchedTenant.unit.property.name})` : ''}
                    <span style={{ color: '#999', marginLeft: 8 }}>matched by phone</span>
                  </div>
                )}
              </>
            )}
            <Form
              form={reconcileForm}
              layout="vertical"
            >
              <Form.Item
                name="targetTenantId"
                label="Assign to Tenant"
                rules={[{ required: true, message: 'Please select a tenant' }]}
              >
                <Select
                  placeholder="Select a tenant"
                  showSearch
                  optionFilterProp="label"
                  options={(() => {
                    // Sort: tenants from matched property first, then the rest
                    const sorted = [...tenantsList].sort((a, b) => {
                      if (!matchedProperty) return 0;
                      const aMatch = a.unit?.property?.name === matchedProperty.name ? 0 : 1;
                      const bMatch = b.unit?.property?.name === matchedProperty.name ? 0 : 1;
                      return aMatch - bMatch;
                    });
                    return sorted.map((t) => {
                      const name = `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim();
                      const unit = t.unit?.unitNumber || '';
                      const property = t.unit?.property?.name || '';
                      const phone = t.user?.phone || '';
                      return {
                        label: `${name}${unit ? ` — ${unit}` : ''}${property ? ` (${property})` : ''}${phone ? ` [${phone}]` : ''}`,
                        value: t.tenantId,
                      };
                    });
                  })()}
                />
              </Form.Item>

              <Form.Item
                name="note"
                label="Note (optional)"
              >
                <Input.TextArea
                  placeholder="Reason for reconciliation (e.g., wrong account number used)"
                  rows={3}
                />
              </Form.Item>
            </Form>
          </div>

          {/* Right column: tenant preview panel */}
          <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid #f0f0f0', paddingLeft: 24 }}>
            <TenantReconcilePreview
              tenantId={reconSelectedTenantId}
              paymentDate={selectedPaymentForReconcile?.transactionDate}
              isOpen={isReconcileModalOpen}
              tenantsList={tenantsList}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
