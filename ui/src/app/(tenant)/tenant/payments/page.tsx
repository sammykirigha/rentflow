"use client";

import { useState } from 'react';
import {
  Typography,
  Table,
  Tag,
  Card,
  Button,
  Empty,
  Grid,
  Spin,
  DatePicker,
  Drawer,
  Descriptions,
  Divider,
} from 'antd';
import {
  DollarOutlined,
  ExportOutlined,
  EyeOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { paymentsApi } from '@/lib/api/payments.api';
import { formatKES } from '@/lib/format-kes';
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/payments';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

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

export default function TenantPaymentsPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data, isLoading } = useQuery({
    queryKey: ['my-payments', page, pageSize],
    queryFn: () => paymentsApi.getMy({ page, limit: pageSize }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const payments: Payment[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await paymentsApi.getMy({ limit: 10000 });
      const allData: Payment[] = Array.isArray(all?.data) ? all.data : [];
      const csvColumns: CsvColumn<Payment>[] = [
        { header: 'Date', accessor: (r) => r.transactionDate ? dayjs(r.transactionDate).format('DD MMM YYYY, HH:mm') : '' },
        { header: 'Amount', accessor: (r) => Number(r.amount) },
        { header: 'Method', accessor: (r) => PAYMENT_METHOD_LABEL_MAP[r.method] || r.method },
        { header: 'Status', accessor: (r) => PAYMENT_STATUS_LABEL_MAP[r.status] || r.status },
        { header: 'M-Pesa Receipt', accessor: (r) => r.mpesaReceiptNumber || '' },
        { header: 'Invoice #', accessor: (r) => r.invoice?.invoiceNumber || '' },
      ];
      downloadCsv(allData, csvColumns, 'my-payments.csv');
    } finally {
      setExporting(false);
    }
  };

  const openDetail = (payment: Payment) => {
    setSelectedPayment(payment);
    setDrawerOpen(true);
  };

  const columns: ColumnsType<Payment> = [
    {
      title: 'Date', dataIndex: 'transactionDate', key: 'transactionDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY, HH:mm') : '-',
      sorter: (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Amount', dataIndex: 'amount', key: 'amount',
      render: (value: number) => <Text strong style={{ color: '#52c41a' }}>{formatKES(value)}</Text>,
      align: 'right',
    },
    {
      title: 'Method', dataIndex: 'method', key: 'method',
      render: (method: PaymentMethod) => PAYMENT_METHOD_LABEL_MAP[method] || method,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: PaymentStatus) => (
        <Tag color={PAYMENT_STATUS_COLOR_MAP[status] || 'default'}>
          {PAYMENT_STATUS_LABEL_MAP[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Invoice #', key: 'invoiceNumber',
      render: (_: unknown, record: Payment) => record.invoice?.invoiceNumber || '-',
    },
    {
      title: '', key: 'actions', width: 60,
      render: (_: unknown, record: Payment) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
      ),
    },
  ];

  const renderMobileCard = (payment: Payment) => (
    <Card
      key={payment.paymentId}
      size="small"
      style={{ marginBottom: 8, cursor: 'pointer' }}
      styles={{ body: { padding: '12px 14px' } }}
      onClick={() => openDetail(payment)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <Text strong style={{ fontSize: 16, color: '#52c41a', display: 'block' }}>
            {formatKES(payment.amount)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {payment.transactionDate ? dayjs(payment.transactionDate).format('DD MMM YYYY, HH:mm') : '-'}
          </Text>
        </div>
        <Tag color={PAYMENT_STATUS_COLOR_MAP[payment.status] || 'default'} style={{ margin: 0 }}>
          {PAYMENT_STATUS_LABEL_MAP[payment.status] || payment.status}
        </Tag>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Method</Text>
        <Text style={{ fontSize: 13 }}>{PAYMENT_METHOD_LABEL_MAP[payment.method] || payment.method}</Text>
      </div>
      {payment.mpesaReceiptNumber && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>M-Pesa Ref</Text>
          <Text style={{ fontSize: 13 }}>{payment.mpesaReceiptNumber}</Text>
        </div>
      )}
      {payment.invoice?.invoiceNumber && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Invoice</Text>
          <Text style={{ fontSize: 13 }}>{payment.invoice.invoiceNumber}</Text>
        </div>
      )}
    </Card>
  );

  const renderPaymentDetail = () => {
    if (!selectedPayment) return null;
    const p = selectedPayment;
    const isPending = p.status === 'pending';

    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Text strong style={{ fontSize: 28, color: '#52c41a', display: 'block' }}>
            {formatKES(p.amount)}
          </Text>
          <Tag color={PAYMENT_STATUS_COLOR_MAP[p.status] || 'default'} style={{ marginTop: 8 }}>
            {PAYMENT_STATUS_LABEL_MAP[p.status] || p.status}
          </Tag>
          {isPending && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
              Initiated {dayjs(p.transactionDate).format('DD MMM YYYY, HH:mm')}
            </Text>
          )}
        </div>

        <Descriptions column={1} size="small" labelStyle={{ fontWeight: 600, width: 140 }}>
          <Descriptions.Item label="Date">
            {p.transactionDate ? dayjs(p.transactionDate).format('DD MMMM YYYY, HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Method">
            {PAYMENT_METHOD_LABEL_MAP[p.method] || p.method}
          </Descriptions.Item>
          {p.mpesaReceiptNumber && (
            <Descriptions.Item label="M-Pesa Receipt">
              <Text copyable>{p.mpesaReceiptNumber}</Text>
            </Descriptions.Item>
          )}
          {p.mpesaPhoneNumber && (
            <Descriptions.Item label="Phone">{p.mpesaPhoneNumber}</Descriptions.Item>
          )}
          {p.invoice?.invoiceNumber && (
            <Descriptions.Item label="Invoice">
              {p.invoice.invoiceNumber}
            </Descriptions.Item>
          )}
          {!p.invoice?.invoiceNumber && p.method !== 'wallet_deduction' && (
            <Descriptions.Item label="Invoice">
              <Text type="secondary">Credited to wallet</Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      </>
    );
  };

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
          <DollarOutlined style={{ marginRight: 8 }} />
          My Payments
        </Title>
        <Button
          icon={<ExportOutlined />}
          onClick={handleExport}
          loading={exporting}
          disabled={isLoading || payments.length === 0}
          size={isMobile ? 'small' : 'middle'}
          aria-label="Export CSV"
        >
          {!isMobile && 'Export CSV'}
        </Button>
      </div>

      {isMobile ? (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : payments.length === 0 ? (
            <Empty description="No payments yet" />
          ) : (
            <>
              {payments.map(renderMobileCard)}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {payments.length} of {pagination?.total || 0}
                </Text>
                {(pagination?.total || 0) > payments.length && (
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
          <Table<Payment>
            columns={columns}
            dataSource={payments}
            loading={isLoading}
            rowKey="paymentId"
            locale={{ emptyText: <Empty description="No payments yet" /> }}
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

      {/* Payment Detail Drawer */}
      <Drawer
        title="Payment Details"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedPayment(null); }}
        width={isMobile ? '100%' : 420}
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '70vh' : undefined}
      >
        {renderPaymentDetail()}
      </Drawer>
    </div>
  );
}
