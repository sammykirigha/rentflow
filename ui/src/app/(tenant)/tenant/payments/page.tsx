"use client";

import { useState } from 'react';
import {
  Typography,
  Table,
  Tag,
  Card,
  Button,
  Empty,
} from 'antd';
import {
  DollarOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { paymentsApi } from '@/lib/api/payments.api';
import { formatKES } from '@/lib/format-kes';
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/payments';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
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

export default function TenantPaymentsPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['my-payments', page, pageSize],
    queryFn: () => paymentsApi.getMy({ page, limit: pageSize }),
    enabled: isAuthenticated,
  });

  const payments: Payment[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

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
      render: (method: PaymentMethod) => PAYMENT_METHOD_LABEL_MAP[method] || method,
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
    },
    {
      title: 'M-Pesa Receipt',
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
          My Payments
        </Title>
        <Button
          icon={<ExportOutlined />}
          onClick={() => {
            const csvColumns: CsvColumn<Payment>[] = [
              { header: 'Date', accessor: (r) => r.transactionDate ? dayjs(r.transactionDate).format('DD MMM YYYY, HH:mm') : '' },
              { header: 'Amount', accessor: (r) => Number(r.amount) },
              { header: 'Method', accessor: (r) => PAYMENT_METHOD_LABEL_MAP[r.method] || r.method },
              { header: 'Status', accessor: (r) => PAYMENT_STATUS_LABEL_MAP[r.status] || r.status },
              { header: 'M-Pesa Receipt', accessor: (r) => r.mpesaReceiptNumber || '' },
              { header: 'Invoice #', accessor: (r) => r.invoice?.invoiceNumber || '' },
            ];
            downloadCsv(payments, csvColumns, 'my-payments.csv');
          }}
          disabled={isLoading || payments.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <Card>
        <Table<Payment>
          columns={columns}
          dataSource={payments}
          loading={isLoading}
          rowKey="paymentId"
          locale={{ emptyText: <Empty description="No payments yet" /> }}
          pagination={{
            current: page,
            pageSize,
            total: pagination?.total || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} payments`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>
    </div>
  );
}
