"use client";

import { useState } from 'react';
import {
  Typography,
  Button,
  Tag,
  Card,
  Descriptions,
  Table,
  App,
  Space,
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Grid,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { invoicesApi } from '@/lib/api/invoices.api';
import { paymentsApi } from '@/lib/api/payments.api';
import { formatKES } from '@/lib/format-kes';
import { parseError } from '@/lib/api/parseError';
import { InvoiceType, INVOICE_TYPE_LABELS } from '@/types/invoices';
import type { Invoice, InvoiceStatus, UpdateInvoiceInput } from '@/types/invoices';
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/payments';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const STATUS_COLOR_MAP: Record<string, string> = {
  paid: 'green',
  partially_paid: 'blue',
  unpaid: 'orange',
  overdue: 'red',
  cancelled: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const TYPE_COLOR_MAP: Record<string, string> = {
  rent: 'blue',
  security_deposit: 'purple',
  service_fee: 'cyan',
  maintenance: 'orange',
  other: 'default',
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

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await invoicesApi.downloadPdf(invoiceId);
    } catch {
      message.error('Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesApi.getOne(invoiceId),
    enabled: isAuthenticated && !!invoiceId,
  });

  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['invoice-payments', invoiceId],
    queryFn: () => paymentsApi.getAll({ invoiceId, limit: 200 }),
    enabled: isAuthenticated && !!invoiceId,
  });

  const payments: Payment[] = Array.isArray(paymentsData?.data) ? paymentsData.data : [];

  const updateMutation = useMutation({
    mutationFn: (values: UpdateInvoiceInput) => invoicesApi.update(invoiceId, values),
    onSuccess: () => {
      message.success('Invoice updated successfully');
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to update invoice'));
    },
  });

  const openEditModal = () => {
    if (!invoice) return;
    editForm.setFieldsValue({
      rentAmount: Number(invoice.rentAmount),
      waterCharge: Number(invoice.waterCharge) || undefined,
      electricityCharge: Number(invoice.electricityCharge) || undefined,
      otherCharges: Number(invoice.otherCharges) || undefined,
      otherChargesDesc: invoice.otherChargesDesc || undefined,
      dueDate: invoice.dueDate ? dayjs(invoice.dueDate) : undefined,
      status: invoice.status,
      notes: invoice.notes || undefined,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      const values = await editForm.validateFields();
      const payload: UpdateInvoiceInput = {
        rentAmount: values.rentAmount,
        waterCharge: values.waterCharge ?? 0,
        electricityCharge: values.electricityCharge ?? 0,
        otherCharges: values.otherCharges ?? 0,
        otherChargesDesc: values.otherChargesDesc || undefined,
        dueDate: values.dueDate?.toISOString(),
        status: values.status,
        notes: values.notes || undefined,
      };
      updateMutation.mutate(payload);
    } catch {
      // validation errors shown inline
    }
  };

  const renderMobilePaymentCard = (payment: Payment) => (
    <Card
      key={payment.paymentId}
      size="small"
      styles={{ body: { padding: '12px 14px' } }}
      style={{ marginBottom: 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Text strong style={{ color: '#52c41a', fontSize: 15 }}>{formatKES(payment.amount)}</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color={PAYMENT_STATUS_COLOR[payment.status] || 'default'} style={{ marginRight: 4 }}>
              {payment.status?.toUpperCase()}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {PAYMENT_METHOD_LABEL[payment.method] || payment.method}
            </Text>
          </div>
          {payment.mpesaReceiptNumber && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
              Ref: {payment.mpesaReceiptNumber}
            </Text>
          )}
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {payment.transactionDate ? dayjs(payment.transactionDate).format('DD MMM YYYY') : '-'}
        </Text>
      </div>
    </Card>
  );

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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <Empty description="Invoice not found">
        <Button type="primary" onClick={() => router.push('/dashboard/invoices')}>
          Back to Invoices
        </Button>
      </Empty>
    );
  }

  const isRentInvoice = invoice.invoiceType === InvoiceType.RENT;
  const hasUtilityCharges = Number(invoice.waterCharge) > 0 || Number(invoice.electricityCharge) > 0 || Number(invoice.otherCharges) > 0;

  const recipientName = invoice.tenant
    ? `${invoice.tenant.user?.firstName || ''} ${invoice.tenant.user?.lastName || ''}`.trim()
    : (invoice.recipientName || '-');

  return (
    <div>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 12 : 0,
        marginBottom: isMobile ? 16 : 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            size={isMobile ? 'small' : 'middle'}
            onClick={() => router.push('/dashboard/invoices')}
          />
          <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            {invoice.invoiceNumber}
          </Title>
          <Tag color={TYPE_COLOR_MAP[invoice.invoiceType] || 'default'}>
            {INVOICE_TYPE_LABELS[invoice.invoiceType] || invoice.invoiceType}
          </Tag>
          <Tag color={STATUS_COLOR_MAP[invoice.status] || 'default'}>
            {STATUS_LABEL_MAP[invoice.status] || invoice.status}
          </Tag>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<EditOutlined />}
            size={isMobile ? 'small' : 'middle'}
            onClick={openEditModal}
          >
            {isMobile ? 'Edit' : 'Edit Invoice'}
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            size={isMobile ? 'small' : 'middle'}
            loading={downloadingPdf}
            onClick={handleDownloadPdf}
          >
            {isMobile ? 'PDF' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Invoice Details */}
      <Card style={{ marginBottom: isMobile ? 12 : 24 }} size={isMobile ? 'small' : 'default'}>
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size={isMobile ? 'small' : 'default'}>
          <Descriptions.Item label={isRentInvoice ? 'Tenant' : 'Recipient'}>
            {invoice.tenant ? (
              <Link href={`/dashboard/tenants/${invoice.tenantId}`}>{recipientName}</Link>
            ) : recipientName}
          </Descriptions.Item>
          {isRentInvoice && (
            <Descriptions.Item label="Unit">
              {invoice.tenant?.unit?.unitNumber || '-'}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Billing Month">
            {invoice.billingMonth ? dayjs(invoice.billingMonth).format('MMMM YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Due Date">
            {invoice.dueDate ? dayjs(invoice.dueDate).format('DD MMM YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Paid At">
            {invoice.paidAt ? dayjs(invoice.paidAt).format('DD MMM YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {invoice.createdAt ? dayjs(invoice.createdAt).format('DD MMM YYYY') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Financial Breakdown */}
      <Card title="Charges Breakdown" style={{ marginBottom: isMobile ? 12 : 24 }} size={isMobile ? 'small' : 'default'}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={isRentInvoice ? 'Rent' : 'Amount'}>
            {formatKES(invoice.rentAmount)}
          </Descriptions.Item>
          {(isRentInvoice || hasUtilityCharges) && (
            <>
              {Number(invoice.waterCharge) > 0 && (
                <Descriptions.Item label="Water Charge">{formatKES(invoice.waterCharge)}</Descriptions.Item>
              )}
              {Number(invoice.electricityCharge) > 0 && (
                <Descriptions.Item label="Electricity Charge">{formatKES(invoice.electricityCharge)}</Descriptions.Item>
              )}
              {Number(invoice.otherCharges) > 0 && (
                <Descriptions.Item label={`Other Charges${invoice.otherChargesDesc ? ` (${invoice.otherChargesDesc})` : ''}`}>
                  {formatKES(invoice.otherCharges)}
                </Descriptions.Item>
              )}
            </>
          )}
          <Descriptions.Item label="Subtotal">
            <Text strong>{formatKES(invoice.subtotal)}</Text>
          </Descriptions.Item>
          {Number(invoice.penaltyAmount) > 0 && (
            <Descriptions.Item label="Penalty">
              <Text type="danger">{formatKES(invoice.penaltyAmount)}</Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Total Amount">
            <Text strong style={{ fontSize: 16 }}>{formatKES(invoice.totalAmount)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Amount Paid">
            <Text type="success">{formatKES(invoice.amountPaid)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Balance Due">
            <Text type={Number(invoice.balanceDue) > 0 ? 'danger' : 'success'} strong style={{ fontSize: 16 }}>
              {formatKES(invoice.balanceDue)}
            </Text>
          </Descriptions.Item>
        </Descriptions>
        {invoice.notes && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Notes: {invoice.notes}</Text>
          </div>
        )}
      </Card>

      {/* Payments */}
      <Card title={`Payments (${payments.length})`} size={isMobile ? 'small' : 'default'}>
        {isMobile ? (
          isLoadingPayments ? (
            <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
          ) : payments.length === 0 ? (
            <Empty description="No payments recorded for this invoice" />
          ) : (
            payments.map(renderMobilePaymentCard)
          )
        ) : (
          <Table<Payment>
            columns={paymentColumns}
            dataSource={payments}
            loading={isLoadingPayments}
            rowKey="paymentId"
            pagination={false}
            locale={{ emptyText: <Empty description="No payments recorded for this invoice" /> }}
          />
        )}
      </Card>

      {/* Edit Invoice Modal */}
      <Modal
        title="Edit Invoice"
        open={isEditModalOpen}
        onOk={handleUpdate}
        onCancel={() => {
          setIsEditModalOpen(false);
          editForm.resetFields();
        }}
        confirmLoading={updateMutation.isPending}
        okText="Save Changes"
        width={560}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="rentAmount"
            label={isRentInvoice ? 'Rent Amount (KES)' : 'Amount (KES)'}
            rules={[{ required: true, message: 'Please enter the amount' }]}
          >
            <InputNumber<number>
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/,/g, ''))}
            />
          </Form.Item>

          {isRentInvoice && (
            <>
              <Form.Item name="waterCharge" label="Water Charge (KES)">
                <InputNumber<number>
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Optional"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/,/g, ''))}
                />
              </Form.Item>

              <Form.Item name="electricityCharge" label="Electricity Charge (KES)">
                <InputNumber<number>
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Optional"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/,/g, ''))}
                />
              </Form.Item>

              <Form.Item name="otherCharges" label="Other Charges (KES)">
                <InputNumber<number>
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Optional"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/,/g, ''))}
                />
              </Form.Item>

              <Form.Item name="otherChargesDesc" label="Other Charges Description">
                <Input placeholder="e.g. Garbage collection" />
              </Form.Item>
            </>
          )}

          <Form.Item name="dueDate" label="Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select
              options={[
                { label: 'Unpaid', value: 'unpaid' },
                { label: 'Partially Paid', value: 'partially_paid' },
                { label: 'Paid', value: 'paid' },
                { label: 'Overdue', value: 'overdue' },
                { label: 'Cancelled', value: 'cancelled' },
              ]}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Optional notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
