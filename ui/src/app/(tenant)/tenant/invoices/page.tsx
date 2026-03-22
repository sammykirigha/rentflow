"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Typography,
  Table,
  Tag,
  Card,
  Button,
  Empty,
  Grid,
  Spin,
  Drawer,
  Descriptions,
  Divider,
  Select,
  DatePicker,
  Space,
  Modal,
  Form,
  InputNumber,
  Input,
  Result,
  message,
} from 'antd';
import {
  DownloadOutlined,
  FileTextOutlined,
  ExportOutlined,
  EyeOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  WarningOutlined,
  FilterOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { invoicesApi } from '@/lib/api/invoices.api';
import { mpesaApi } from '@/lib/api/mpesa.api';
import { formatKES } from '@/lib/format-kes';
import { getMpesaErrorMessage, isValidKenyanPhone } from '@/lib/mpesa-errors';
import type { Invoice, InvoiceStatus } from '@/types/invoices';
import { PaymentStatus } from '@/types/payments';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
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

type StkModalState = "idle" | "initiating" | "waiting" | "success" | "failed" | "timeout";
const MAX_POLLS = 10;
const POLL_INTERVAL_MS = 3000;

export default function TenantInvoicesPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [monthFilter, setMonthFilter] = useState<string | undefined>(undefined);

  // STK Push state for Pay Now
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [stkState, setStkState] = useState<StkModalState>("idle");
  const [stkError, setStkError] = useState("");
  const [form] = Form.useForm();
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dispute state
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeInvoice, setDisputeInvoice] = useState<Invoice | null>(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeForm] = Form.useForm();

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-invoices', page, pageSize, statusFilter, monthFilter],
    queryFn: () => invoicesApi.getMy({ page, limit: pageSize, status: statusFilter }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const invoices: Invoice[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const pollStkStatus = useCallback(
    (paymentId: string, attempt: number) => {
      if (attempt >= MAX_POLLS) {
        setStkState("timeout");
        return;
      }
      pollTimerRef.current = setTimeout(async () => {
        try {
          const result = await mpesaApi.checkStkStatus(paymentId);
          if (result.status === PaymentStatus.COMPLETED) {
            setStkState("success");
            refetch();
            return;
          }
          if (result.status === PaymentStatus.FAILED) {
            setStkState("failed");
            setStkError(getMpesaErrorMessage(result.resultCode, result.resultDesc));
            return;
          }
          pollStkStatus(paymentId, attempt + 1);
        } catch {
          pollStkStatus(paymentId, attempt + 1);
        }
      }, POLL_INTERVAL_MS);
    },
    [refetch],
  );

  const handlePayNow = (invoice: Invoice) => {
    setPayingInvoice(invoice);
    setStkState("idle");
    setStkError("");
    form.setFieldsValue({ amount: Number(invoice.balanceDue) });
    setPayModalOpen(true);
  };

  const handleStkSubmit = async (values: { amount: number; phoneNumber?: string }) => {
    try {
      setStkState("initiating");
      setStkError("");
      const result = await mpesaApi.initiateStkPush({
        amount: values.amount,
        phoneNumber: values.phoneNumber || undefined,
      });
      setStkState("waiting");
      pollStkStatus(result.paymentId, 0);
    } catch (err: unknown) {
      setStkState("failed");
      const error = err as Record<string, unknown>;
      const axiosError = error?.response as Record<string, unknown> | undefined;
      const axiosData = axiosError?.data as Record<string, unknown> | undefined;
      const nestedError = axiosData?.error as Record<string, unknown> | undefined;
      const rawMsg =
        (axiosData?.message as string) ||
        (nestedError?.message as string) ||
        "";
      setStkError(getMpesaErrorMessage(undefined, rawMsg));
    }
  };

  const handleClosePayModal = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPayModalOpen(false);
    setStkState("idle");
    setStkError("");
    setPayingInvoice(null);
    form.resetFields();
  };

  const handleDispute = (invoice: Invoice) => {
    setDisputeInvoice(invoice);
    disputeForm.resetFields();
    setDisputeModalOpen(true);
  };

  const handleDisputeSubmit = async (values: { reason: string; comment: string }) => {
    if (!disputeInvoice) return;
    setDisputeSubmitting(true);
    try {
      await invoicesApi.disputeInvoice(disputeInvoice.invoiceId, values);
      message.success('Dispute submitted successfully. The landlord will review it.');
      setDisputeModalOpen(false);
      setDisputeInvoice(null);
      disputeForm.resetFields();
    } catch {
      message.error('Failed to submit dispute. Please try again.');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const openDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDrawerOpen(true);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await invoicesApi.getMy({ limit: 10000, status: statusFilter });
      const allData: Invoice[] = Array.isArray(all?.data) ? all.data : [];
      const csvColumns: CsvColumn<Invoice>[] = [
        { header: 'Invoice #', accessor: (r) => r.invoiceNumber },
        { header: 'Billing Month', accessor: (r) => r.billingMonth ? dayjs(r.billingMonth).format('MMM YYYY') : '' },
        { header: 'Total Amount', accessor: (r) => Number(r.totalAmount) },
        { header: 'Paid', accessor: (r) => Number(r.amountPaid) },
        { header: 'Balance', accessor: (r) => Number(r.balanceDue) },
        { header: 'Status', accessor: (r) => STATUS_LABEL_MAP[r.status] || r.status },
        { header: 'Due Date', accessor: (r) => r.dueDate ? dayjs(r.dueDate).format('DD MMM YYYY') : '' },
      ];
      downloadCsv(allData, csvColumns, 'my-invoices.csv');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<Invoice> = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    {
      title: 'Billing Month', dataIndex: 'billingMonth', key: 'billingMonth',
      render: (value: string) => value ? dayjs(value).format('MMM YYYY') : '-',
    },
    {
      title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount',
      render: (value: number) => formatKES(value), align: 'right',
    },
    {
      title: 'Balance', dataIndex: 'balanceDue', key: 'balanceDue',
      render: (value: number) => (
        <Text style={{ color: Number(value) > 0 ? '#ff4d4f' : undefined, fontWeight: Number(value) > 0 ? 600 : undefined }}>
          {formatKES(value)}
        </Text>
      ), align: 'right',
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: InvoiceStatus) => (
        <Tag color={STATUS_COLOR_MAP[status] || 'default'}>{STATUS_LABEL_MAP[status] || status}</Tag>
      ),
    },
    {
      title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Actions', key: 'actions', width: 160,
      render: (_: unknown, record: Invoice) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>View</Button>
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => invoicesApi.downloadPdf(record.invoiceId)}>PDF</Button>
        </Space>
      ),
    },
  ];

  const renderMobileCard = (invoice: Invoice) => (
    <Card
      key={invoice.invoiceId}
      size="small"
      style={{ marginBottom: 8, cursor: 'pointer' }}
      styles={{ body: { padding: '12px 14px' } }}
      onClick={() => openDetail(invoice)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <Text strong style={{ fontSize: 14, display: 'block' }}>{invoice.invoiceNumber}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {invoice.billingMonth ? dayjs(invoice.billingMonth).format('MMM YYYY') : '-'}
          </Text>
        </div>
        <Tag color={STATUS_COLOR_MAP[invoice.status] || 'default'} style={{ margin: 0 }}>
          {STATUS_LABEL_MAP[invoice.status] || invoice.status}
        </Tag>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Total</Text>
        <Text strong style={{ fontSize: 14 }}>{formatKES(invoice.totalAmount)}</Text>
      </div>
      {Number(invoice.balanceDue) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Balance Due</Text>
          <Text strong style={{ fontSize: 14, color: '#ff4d4f' }}>{formatKES(invoice.balanceDue)}</Text>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Due: {invoice.dueDate ? dayjs(invoice.dueDate).format('DD MMM YYYY') : '-'}
        </Text>
        <Space size={4}>
          {(invoice.status === 'unpaid' || invoice.status === 'overdue' || invoice.status === 'partially_paid') && (
            <Button
              type="primary"
              size="small"
              icon={<MobileOutlined />}
              onClick={(e) => { e.stopPropagation(); handlePayNow(invoice); }}
            >
              Pay
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={(e) => { e.stopPropagation(); invoicesApi.downloadPdf(invoice.invoiceId); }}
            style={{ padding: 0 }}
          >
            PDF
          </Button>
        </Space>
      </div>
    </Card>
  );

  const renderInvoiceDetail = () => {
    if (!selectedInvoice) return null;
    const inv = selectedInvoice;
    const hasBalance = Number(inv.balanceDue) > 0;
    const hasPenalty = Number(inv.penaltyAmount) > 0;

    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Tag color={STATUS_COLOR_MAP[inv.status] || 'default'} style={{ fontSize: 14, padding: '4px 16px' }}>
            {STATUS_LABEL_MAP[inv.status] || inv.status}
          </Tag>
        </div>

        <Descriptions column={1} size="small" labelStyle={{ fontWeight: 600, width: 140 }}>
          <Descriptions.Item label="Invoice #">{inv.invoiceNumber}</Descriptions.Item>
          <Descriptions.Item label="Billing Month">
            {inv.billingMonth ? dayjs(inv.billingMonth).format('MMMM YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Due Date">
            {inv.dueDate ? dayjs(inv.dueDate).format('DD MMMM YYYY') : '-'}
          </Descriptions.Item>
          {inv.paidAt && (
            <Descriptions.Item label="Paid On">
              {dayjs(inv.paidAt).format('DD MMMM YYYY')}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider style={{ margin: '12px 0' }}>Charge Breakdown</Divider>

        <div style={{ background: '#fafafa', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>Rent</Text>
            <Text strong>{formatKES(inv.rentAmount)}</Text>
          </div>
          {Number(inv.waterCharge) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>Water</Text>
              <Text strong>{formatKES(inv.waterCharge)}</Text>
            </div>
          )}
          {Number(inv.electricityCharge) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>Electricity</Text>
              <Text strong>{formatKES(inv.electricityCharge)}</Text>
            </div>
          )}
          {Number(inv.otherCharges) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>{inv.otherChargesDesc || 'Other Charges'}</Text>
              <Text strong>{formatKES(inv.otherCharges)}</Text>
            </div>
          )}

          <Divider style={{ margin: '8px 0' }} dashed />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text>Subtotal</Text>
            <Text strong>{formatKES(inv.subtotal)}</Text>
          </div>

          {hasPenalty && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#ff4d4f' }}>
                <WarningOutlined style={{ marginRight: 4 }} />
                Late Penalty (5%)
              </Text>
              <Text strong style={{ color: '#ff4d4f' }}>{formatKES(inv.penaltyAmount)}</Text>
            </div>
          )}
          {hasPenalty && inv.penaltyAppliedAt && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Penalty applied on {dayjs(inv.penaltyAppliedAt).format('DD MMM YYYY')} for late payment after due date.
            </Text>
          )}

          <Divider style={{ margin: '8px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong style={{ fontSize: 16 }}>Total</Text>
            <Text strong style={{ fontSize: 16 }}>{formatKES(inv.totalAmount)}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#52c41a' }}>Amount Paid</Text>
            <Text strong style={{ color: '#52c41a' }}>{formatKES(inv.amountPaid)}</Text>
          </div>
          {hasBalance && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>Balance Due</Text>
              <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>{formatKES(inv.balanceDue)}</Text>
            </div>
          )}
        </div>

        {inv.notes && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>Notes: {inv.notes}</Text>
          </>
        )}

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hasBalance && (inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'partially_paid') && (
            <Button
              type="primary"
              icon={<MobileOutlined />}
              block
              size="large"
              onClick={() => { setDrawerOpen(false); handlePayNow(inv); }}
            >
              Pay {formatKES(inv.balanceDue)} via M-Pesa
            </Button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              icon={<DownloadOutlined />}
              block
              size="large"
              onClick={() => invoicesApi.downloadPdf(inv.invoiceId)}
            >
              Download PDF
            </Button>
            {inv.status !== 'cancelled' && inv.status !== 'paid' && (
              <Button
                icon={<ExclamationCircleOutlined />}
                block
                size="large"
                onClick={() => { setDrawerOpen(false); handleDispute(inv); }}
              >
                Dispute
              </Button>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderPayModalContent = () => {
    switch (stkState) {
      case "idle":
        return (
          <Form form={form} layout="vertical" onFinish={handleStkSubmit}>
            <div style={{ textAlign: 'center', marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 8 }}>
              <Text type="secondary">Paying for</Text>
              <br />
              <Text strong>{payingInvoice?.invoiceNumber}</Text>
            </div>
            <Form.Item
              name="amount"
              label="Amount (KES)"
              rules={[
                { required: true, message: "Please enter amount" },
                { type: "number", min: 1, message: "Minimum is KES 1" },
                { type: "number", max: 500000, message: "Maximum is KES 500,000" },
              ]}
            >
              <InputNumber<number>
                style={{ width: "100%" }}
                min={1}
                max={500000}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(value) => Number(value?.replace(/,/g, "") || 0)}
              />
            </Form.Item>
            <Form.Item
              name="phoneNumber"
              label="M-Pesa Phone Number (Optional)"
              help="Leave blank to use your registered number. Formats: 0712345678 or +254712345678"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    if (isValidKenyanPhone(value)) return Promise.resolve();
                    return Promise.reject('Enter a valid Kenyan phone number (e.g. 0712345678)');
                  },
                },
              ]}
            >
              <Input placeholder="e.g. 0712345678" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block icon={<MobileOutlined />} size="large">
              Pay via M-Pesa
            </Button>
          </Form>
        );
      case "initiating":
        return (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} />} />
            <Title level={4} style={{ marginTop: 24 }}>Initiating M-Pesa payment...</Title>
            <Text type="secondary">Please wait while we send the payment request.</Text>
          </div>
        );
      case "waiting":
        return (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <MobileOutlined style={{ fontSize: 64, color: "#52c41a" }} />
            <Title level={4} style={{ marginTop: 24 }}>Check your phone</Title>
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              Enter your M-Pesa PIN to complete the payment.
            </Text>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} />} />
            <br />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
              Waiting for confirmation...
            </Text>
          </div>
        );
      case "success":
        return (
          <Result
            status="success"
            icon={<CheckCircleOutlined />}
            title="Payment Successful"
            subTitle="Your payment is being processed. The invoice will be updated shortly."
            extra={<Button type="primary" onClick={handleClosePayModal}>Done</Button>}
          />
        );
      case "failed":
        return (
          <Result
            status="error"
            icon={<CloseCircleOutlined />}
            title="Payment Failed"
            subTitle={stkError || "The M-Pesa payment was not completed."}
            extra={[
              <Button key="retry" type="primary" onClick={() => { setStkState("idle"); setStkError(""); }}>Try Again</Button>,
              <Button key="close" onClick={handleClosePayModal}>Close</Button>,
            ]}
          />
        );
      case "timeout":
        return (
          <Result
            status="warning"
            title="Payment Processing"
            subTitle="If money was deducted, your wallet will be updated shortly."
            extra={<Button type="primary" onClick={handleClosePayModal}>Close</Button>}
          />
        );
    }
  };

  const hasActiveFilters = statusFilter || monthFilter;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobile ? 8 : 16,
        gap: 8,
      }}>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          My Invoices
        </Title>
        <Button
          icon={<ExportOutlined />}
          onClick={handleExport}
          loading={exporting}
          disabled={isLoading || invoices.length === 0}
          size={isMobile ? 'small' : 'middle'}
          aria-label="Export CSV"
        >
          {!isMobile && 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: isMobile ? 8 : 16,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <FilterOutlined style={{ color: '#8c8c8c' }} />
        <Select
          allowClear
          placeholder="Status"
          style={{ width: isMobile ? 120 : 160 }}
          size={isMobile ? 'small' : 'middle'}
          value={statusFilter}
          onChange={(val) => { setStatusFilter(val); setPage(1); }}
          options={[
            { label: 'Unpaid', value: 'unpaid' },
            { label: 'Partially Paid', value: 'partially_paid' },
            { label: 'Overdue', value: 'overdue' },
            { label: 'Paid', value: 'paid' },
            { label: 'Cancelled', value: 'cancelled' },
          ]}
        />
        <DatePicker
          picker="month"
          placeholder="Month"
          style={{ width: isMobile ? 120 : 160 }}
          size={isMobile ? 'small' : 'middle'}
          onChange={(date) => {
            setMonthFilter(date ? date.format('YYYY-MM') : undefined);
            setPage(1);
          }}
          allowClear
        />
        {hasActiveFilters && (
          <Button
            size="small"
            type="link"
            onClick={() => { setStatusFilter(undefined); setMonthFilter(undefined); setPage(1); }}
          >
            Clear
          </Button>
        )}
      </div>

      {isMobile ? (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : invoices.length === 0 ? (
            <Empty description="No invoices found" />
          ) : (
            <>
              {invoices.map(renderMobileCard)}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {invoices.length} of {pagination?.total || 0}
                </Text>
                {(pagination?.total || 0) > invoices.length && (
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" onClick={() => setPageSize(pageSize + 10)}>Load More</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <Card>
          <Table<Invoice>
            columns={columns}
            dataSource={invoices}
            loading={isLoading}
            rowKey="invoiceId"
            locale={{ emptyText: <Empty description="No invoices found" /> }}
            onRow={(record) => ({ onClick: () => openDetail(record), style: { cursor: 'pointer' } })}
            pagination={{
              current: page,
              pageSize,
              total: pagination?.total || 0,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
          />
        </Card>
      )}

      {/* Invoice Detail Drawer */}
      <Drawer
        title={selectedInvoice?.invoiceNumber || 'Invoice Details'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedInvoice(null); }}
        width={isMobile ? '100%' : 480}
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '90vh' : undefined}
      >
        {renderInvoiceDetail()}
      </Drawer>

      {/* Pay Now Modal */}
      <Modal
        title={stkState === "idle" ? `Pay Invoice ${payingInvoice?.invoiceNumber || ''}` : undefined}
        open={payModalOpen}
        onCancel={handleClosePayModal}
        footer={null}
        closable={stkState !== "initiating" && stkState !== "waiting"}
        maskClosable={stkState === "idle" || stkState === "success" || stkState === "failed" || stkState === "timeout"}
        width={isMobile ? '95vw' : 420}
        centered={isMobile}
      >
        {renderPayModalContent()}
      </Modal>

      {/* Dispute Invoice Modal */}
      <Modal
        title={`Dispute Invoice ${disputeInvoice?.invoiceNumber || ''}`}
        open={disputeModalOpen}
        onCancel={() => { setDisputeModalOpen(false); setDisputeInvoice(null); disputeForm.resetFields(); }}
        footer={null}
        width={isMobile ? '95vw' : 480}
        centered={isMobile}
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffe58f' }}>
          <Text style={{ fontSize: 13 }}>
            <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Your dispute will be sent to the landlord for review. You will receive a notification once it has been resolved.
          </Text>
        </div>
        <Form form={disputeForm} layout="vertical" onFinish={handleDisputeSubmit}>
          <Form.Item
            name="reason"
            label="Reason for Dispute"
            rules={[{ required: true, message: 'Please select a reason' }]}
          >
            <Select
              placeholder="Select a reason"
              options={[
                { label: 'Incorrect rent amount', value: 'incorrect_rent' },
                { label: 'Wrong water/electricity charges', value: 'wrong_utilities' },
                { label: 'Already paid (not reflected)', value: 'already_paid' },
                { label: 'Penalty applied unfairly', value: 'unfair_penalty' },
                { label: 'Duplicate invoice', value: 'duplicate' },
                { label: 'Other', value: 'other' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="comment"
            label="Additional Details"
            rules={[
              { required: true, message: 'Please provide details about the dispute' },
              { min: 10, message: 'Please provide at least 10 characters' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Explain why you are disputing this invoice..."
              showCount
              maxLength={500}
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={disputeSubmitting}
            icon={<ExclamationCircleOutlined />}
          >
            Submit Dispute
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
