"use client";

import { useState } from 'react';
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
  DatePicker,
  Card,
  App,
  Space,
  Radio,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { invoicesApi } from '@/lib/api/invoices.api';
import { tenantsApi } from '@/lib/api/tenants.api';
import { parseError } from '@/lib/api/parseError';
import { formatKES } from '@/lib/format-kes';
import { InvoiceType, INVOICE_TYPE_LABELS } from '@/types/invoices';
import type { Invoice, CreateInvoiceInput, InvoiceStatus } from '@/types/invoices';
import type { Tenant } from '@/types/tenants';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
import dayjs from 'dayjs';

const { Title } = Typography;

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

export default function InvoicesPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm();

  const { isAuthenticated } = useAuth();

  const [recipientMode, setRecipientMode] = useState<'tenant' | 'custom'>('tenant');

  const invoiceType = Form.useWatch('invoiceType', form);
  const isRent = invoiceType === InvoiceType.RENT;
  const isOther = invoiceType === InvoiceType.OTHER;

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, page, pageSize],
    queryFn: () => invoicesApi.getAll({ status: statusFilter, page, limit: pageSize }),
    enabled: isAuthenticated,
  });

  const invoices: Invoice[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants', 'all'],
    queryFn: () => tenantsApi.getAll({ limit: 200 }),
    enabled: isModalOpen,
  });

  const tenantsList: Tenant[] = Array.isArray(tenantsData?.data) ? tenantsData.data : [];

  const createMutation = useMutation({
    mutationFn: (values: CreateInvoiceInput) => invoicesApi.create(values),
    onSuccess: () => {
      message.success('Invoice created successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to create invoice'));
    },
  });

  const handleTenantChange = (tenantId: string) => {
    const tenant = tenantsList.find((t) => t.tenantId === tenantId);
    if (tenant?.unit?.rentAmount) {
      form.setFieldsValue({ rentAmount: Number(tenant.unit.rentAmount) });
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const typeIsRent = values.invoiceType === InvoiceType.RENT;
      const payload: CreateInvoiceInput = {
        invoiceType: values.invoiceType,
        billingMonth: values.billingMonth.startOf('month').toISOString(),
        rentAmount: values.rentAmount,
        dueDate: values.dueDate.toISOString(),
        notes: values.notes || undefined,
      };

      if (typeIsRent) {
        payload.tenantId = values.tenantId;
        payload.waterCharge = values.waterCharge ?? undefined;
        payload.electricityCharge = values.electricityCharge ?? undefined;
        payload.otherCharges = values.otherCharges ?? undefined;
        payload.otherChargesDesc = values.otherChargesDesc || undefined;
      } else if (recipientMode === 'tenant') {
        payload.tenantId = values.tenantId;
      } else {
        payload.recipientName = values.recipientName;
      }

      createMutation.mutate(payload);
    } catch {
      // validation errors are shown inline by Ant Design
    }
  };

  const getRecipientDisplay = (record: Invoice) => {
    if (record.tenant) {
      const firstName = record.tenant?.user?.firstName || '';
      const lastName = record.tenant?.user?.lastName || '';
      return `${firstName} ${lastName}`.trim() || '-';
    }
    return record.recipientName || '-';
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      sorter: (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber),
    },
    {
      title: 'Type',
      dataIndex: 'invoiceType',
      key: 'invoiceType',
      render: (type: InvoiceType) => (
        <Tag color={TYPE_COLOR_MAP[type] || 'default'}>
          {INVOICE_TYPE_LABELS[type] || type}
        </Tag>
      ),
      filters: Object.entries(INVOICE_TYPE_LABELS).map(([value, text]) => ({ text, value })),
      onFilter: (value, record) => record.invoiceType === value,
    },
    {
      title: 'Recipient',
      key: 'tenant',
      render: (_: unknown, record: Invoice) => getRecipientDisplay(record),
      sorter: (a, b) => {
        const nameA = getRecipientDisplay(a);
        const nameB = getRecipientDisplay(b);
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: 'Billing Month',
      dataIndex: 'billingMonth',
      key: 'billingMonth',
      render: (value: string) => value ? dayjs(value).format('MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.billingMonth).getTime() - new Date(b.billingMonth).getTime(),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (value: number) => formatKES(value),
      sorter: (a, b) => a.totalAmount - b.totalAmount,
      align: 'right',
    },
    {
      title: 'Paid',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      render: (value: number) => formatKES(value),
      sorter: (a, b) => a.amountPaid - b.amountPaid,
      align: 'right',
    },
    {
      title: 'Balance',
      dataIndex: 'balanceDue',
      key: 'balanceDue',
      render: (value: number) => formatKES(value),
      sorter: (a, b) => a.balanceDue - b.balanceDue,
      align: 'right',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: InvoiceStatus) => (
        <Tag color={STATUS_COLOR_MAP[status] || 'default'}>
          {STATUS_LABEL_MAP[status] || status}
        </Tag>
      ),
      filters: [
        { text: 'Paid', value: 'paid' },
        { text: 'Partially Paid', value: 'partially_paid' },
        { text: 'Unpaid', value: 'unpaid' },
        { text: 'Overdue', value: 'overdue' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Invoice) => (
        <span style={{ display: 'flex', gap: 4 }}>
          <Link href={`/dashboard/invoices/${record.invoiceId}`}>
            <Button type="link" icon={<EyeOutlined />} size="small">
              View
            </Button>
          </Link>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => invoicesApi.downloadPdf(record.invoiceId)}
          >
            PDF
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Invoices
        </Title>
        <Space>
          <Button
            icon={<ExportOutlined />}
            onClick={async () => {
              setExporting(true);
              try {
                const all = await invoicesApi.getAll({ limit: 10000, status: statusFilter });
                const allData: Invoice[] = Array.isArray(all?.data) ? all.data : [];
                const csvColumns: CsvColumn<Invoice>[] = [
                  { header: 'Invoice #', accessor: (r) => r.invoiceNumber },
                  { header: 'Type', accessor: (r) => INVOICE_TYPE_LABELS[r.invoiceType] || r.invoiceType },
                  { header: 'Recipient', accessor: (r) => getRecipientDisplay(r) },
                  { header: 'Billing Month', accessor: (r) => r.billingMonth ? dayjs(r.billingMonth).format('MMM YYYY') : '' },
                  { header: 'Total Amount', accessor: (r) => Number(r.totalAmount) },
                  { header: 'Paid', accessor: (r) => Number(r.amountPaid) },
                  { header: 'Balance', accessor: (r) => Number(r.balanceDue) },
                  { header: 'Status', accessor: (r) => STATUS_LABEL_MAP[r.status] || r.status },
                  { header: 'Due Date', accessor: (r) => r.dueDate ? dayjs(r.dueDate).format('DD MMM YYYY') : '' },
                ];
                downloadCsv(allData, csvColumns, 'invoices.csv');
              } finally {
                setExporting(false);
              }
            }}
            loading={exporting}
            disabled={isLoading || invoices.length === 0}
          >
            Export CSV
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Invoice
          </Button>
        </Space>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by status"
            allowClear
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
            style={{ width: 200 }}
            options={[
              { label: 'Paid', value: 'paid' },
              { label: 'Partially Paid', value: 'partially_paid' },
              { label: 'Unpaid', value: 'unpaid' },
              { label: 'Overdue', value: 'overdue' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
          />
        </div>

        <Table<Invoice>
          columns={columns}
          dataSource={invoices}
          loading={isLoading}
          rowKey="invoiceId"
          pagination={{
            current: page,
            pageSize,
            total: pagination?.total || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      <Modal
        title="Create Invoice"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending}
        okText="Create Invoice"
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{ invoiceType: InvoiceType.RENT }}
        >
          <Form.Item
            name="invoiceType"
            label="Invoice Purpose"
            rules={[{ required: true, message: 'Please select the invoice purpose' }]}
          >
            <Select
              options={Object.entries(INVOICE_TYPE_LABELS).map(([value, label]) => ({
                label,
                value,
              }))}
              onChange={() => {
                // Clear type-specific fields when switching
                form.setFieldsValue({
                  tenantId: undefined,
                  recipientName: undefined,
                  rentAmount: undefined,
                  waterCharge: undefined,
                  electricityCharge: undefined,
                  otherCharges: undefined,
                  otherChargesDesc: undefined,
                  notes: undefined,
                });
                setRecipientMode('tenant');
              }}
            />
          </Form.Item>

          {isRent ? (
            <Form.Item
              name="tenantId"
              label="Tenant"
              rules={[{ required: true, message: 'Please select a tenant' }]}
            >
              <Select
                placeholder="Select a tenant"
                showSearch
                optionFilterProp="label"
                onChange={handleTenantChange}
                options={tenantsList.map((t) => ({
                  label: `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim() +
                    (t.unit?.unitNumber ? ` (${t.unit.unitNumber})` : ''),
                  value: t.tenantId,
                }))}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item label="Recipient">
                <Radio.Group
                  value={recipientMode}
                  onChange={(e) => {
                    setRecipientMode(e.target.value);
                    form.setFieldsValue({ tenantId: undefined, recipientName: undefined });
                  }}
                  optionType="button"
                  buttonStyle="solid"
                  size="small"
                  style={{ marginBottom: 12 }}
                >
                  <Radio.Button value="tenant">Select Tenant</Radio.Button>
                  <Radio.Button value="custom">Custom Name</Radio.Button>
                </Radio.Group>

                {recipientMode === 'tenant' ? (
                  <Form.Item
                    name="tenantId"
                    noStyle
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
                ) : (
                  <Form.Item
                    name="recipientName"
                    noStyle
                    rules={[{ required: true, message: 'Please enter the recipient name' }]}
                  >
                    <Input placeholder="e.g. John Doe" />
                  </Form.Item>
                )}
              </Form.Item>
            </>
          )}

          <Form.Item
            name="billingMonth"
            label="Billing Month"
            rules={[{ required: true, message: 'Please select the billing month' }]}
          >
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="rentAmount"
            label={isRent ? 'Rent Amount (KES)' : 'Amount (KES)'}
            rules={[{ required: true, message: `Please enter the ${isRent ? 'rent ' : ''}amount` }]}
          >
            <InputNumber<number>
              min={0}
              style={{ width: '100%' }}
              placeholder={isRent ? 'e.g. 35000' : 'e.g. 10000'}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/,/g, ''))}
            />
          </Form.Item>

          {isRent && (
            <>
              <Form.Item
                name="waterCharge"
                label="Water Charge (KES)"
              >
                <InputNumber<number>
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Optional"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/,/g, ''))}
                />
              </Form.Item>

              <Form.Item
                name="electricityCharge"
                label="Electricity Charge (KES)"
              >
                <InputNumber<number>
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Optional"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/,/g, ''))}
                />
              </Form.Item>

              <Form.Item
                name="otherCharges"
                label="Other Charges (KES)"
              >
                <InputNumber<number>
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Optional"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/,/g, ''))}
                />
              </Form.Item>

              <Form.Item
                name="otherChargesDesc"
                label="Other Charges Description"
              >
                <Input placeholder="e.g. Garbage collection" />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="dueDate"
            label="Due Date"
            rules={[{ required: true, message: 'Please select the due date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="notes"
            label={isOther ? 'Description' : 'Notes'}
            rules={isOther ? [{ required: true, message: 'Please enter a description for this invoice' }] : undefined}
          >
            <Input.TextArea
              rows={3}
              placeholder={isOther ? 'Describe the purpose of this invoice' : (isRent ? 'Optional notes for this invoice' : 'Optional description')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
