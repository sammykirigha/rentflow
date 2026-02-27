"use client";

import { useState } from 'react';
import {
  Typography,
  Table,
  Card,
  Button,
  Empty,
} from 'antd';
import {
  DownloadOutlined,
  FileProtectOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { receiptsApi } from '@/lib/api/receipts.api';
import { formatKES } from '@/lib/format-kes';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
import dayjs from 'dayjs';

interface Receipt {
  receiptId: string;
  receiptNumber: string;
  invoiceId: string;
  totalPaid: number;
  pdfUrl?: string;
  createdAt: string;
  invoice?: {
    invoiceNumber: string;
    billingMonth: string;
  };
}

const { Title } = Typography;

export default function TenantReceiptsPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-receipts', page, pageSize],
    queryFn: () => receiptsApi.getMy({ page, limit: pageSize }),
    enabled: isAuthenticated,
  });

  const receipts: Receipt[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const columns: ColumnsType<Receipt> = [
    {
      title: 'Receipt #',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
    },
    {
      title: 'Invoice #',
      key: 'invoiceNumber',
      render: (_: unknown, record: Receipt) => record.invoice?.invoiceNumber || '-',
    },
    {
      title: 'Billing Month',
      key: 'billingMonth',
      render: (_: unknown, record: Receipt) =>
        record.invoice?.billingMonth
          ? dayjs(record.invoice.billingMonth).format('MMM YYYY')
          : '-',
    },
    {
      title: 'Total Paid',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      render: (value: number) => formatKES(value),
      align: 'right',
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Receipt) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          size="small"
          onClick={() => receiptsApi.downloadPdf(record.receiptId)}
        >
          PDF
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <FileProtectOutlined style={{ marginRight: 8 }} />
          My Receipts
        </Title>
        <Button
          icon={<ExportOutlined />}
          onClick={async () => {
            setExporting(true);
            try {
              const all = await receiptsApi.getMy({ limit: 10000 });
              const allData: Receipt[] = Array.isArray(all?.data) ? all.data : [];
              const csvColumns: CsvColumn<Receipt>[] = [
                { header: 'Receipt #', accessor: (r) => r.receiptNumber },
                { header: 'Invoice #', accessor: (r) => r.invoice?.invoiceNumber || '' },
                { header: 'Billing Month', accessor: (r) => r.invoice?.billingMonth ? dayjs(r.invoice.billingMonth).format('MMM YYYY') : '' },
                { header: 'Total Paid', accessor: (r) => Number(r.totalPaid) },
                { header: 'Date', accessor: (r) => r.createdAt ? dayjs(r.createdAt).format('DD MMM YYYY') : '' },
              ];
              downloadCsv(allData, csvColumns, 'my-receipts.csv');
            } finally {
              setExporting(false);
            }
          }}
          loading={exporting}
          disabled={isLoading || receipts.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <Card>
        <Table<Receipt>
          columns={columns}
          dataSource={receipts}
          loading={isLoading}
          rowKey="receiptId"
          locale={{ emptyText: <Empty description="No receipts yet" /> }}
          pagination={{
            current: page,
            pageSize,
            total: pagination?.total || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} receipts`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>
    </div>
  );
}
