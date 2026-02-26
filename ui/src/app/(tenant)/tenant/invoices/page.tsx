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
  DownloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { invoicesApi } from '@/lib/api/invoices.api';
import { formatKES } from '@/lib/format-kes';
import type { Invoice, InvoiceStatus } from '@/types/invoices';
import type { ColumnsType } from 'antd/es/table';
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

export default function TenantInvoicesPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['my-invoices', page, pageSize],
    queryFn: () => invoicesApi.getMy({ page, limit: pageSize }),
    enabled: isAuthenticated,
  });

  const invoices: Invoice[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const columns: ColumnsType<Invoice> = [
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
    },
    {
      title: 'Total Amount',
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
      render: (value: number) => formatKES(value),
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
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Invoice) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          size="small"
          onClick={() => invoicesApi.downloadPdf(record.invoiceId)}
        >
          PDF
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        My Invoices
      </Title>

      <Card>
        <Table<Invoice>
          columns={columns}
          dataSource={invoices}
          loading={isLoading}
          rowKey="invoiceId"
          locale={{ emptyText: <Empty description="No invoices yet" /> }}
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
    </div>
  );
}
