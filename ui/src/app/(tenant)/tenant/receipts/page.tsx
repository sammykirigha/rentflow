"use client";

import { useState } from 'react';
import {
  Typography,
  Table,
  Card,
  Button,
  Empty,
  Grid,
  Spin,
  Drawer,
  Descriptions,
  Divider,
} from 'antd';
import {
  DownloadOutlined,
  FileProtectOutlined,
  ExportOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { receiptsApi } from '@/lib/api/receipts.api';
import { invoicesApi } from '@/lib/api/invoices.api';
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
    invoiceId: string;
    invoiceNumber: string;
    billingMonth: string;
    totalAmount: number;
    rentAmount: number;
    waterCharge: number;
    electricityCharge: number;
    penaltyAmount: number;
  };
}

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function TenantReceiptsPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data, isLoading } = useQuery({
    queryKey: ['my-receipts', page, pageSize],
    queryFn: () => receiptsApi.getMy({ page, limit: pageSize }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const receipts: Receipt[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const handleExport = async () => {
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
  };

  const openDetail = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setDrawerOpen(true);
  };

  const columns: ColumnsType<Receipt> = [
    { title: 'Receipt #', dataIndex: 'receiptNumber', key: 'receiptNumber' },
    {
      title: 'Invoice #', key: 'invoiceNumber',
      render: (_: unknown, record: Receipt) => record.invoice?.invoiceNumber || '-',
    },
    {
      title: 'Billing Month', key: 'billingMonth',
      render: (_: unknown, record: Receipt) =>
        record.invoice?.billingMonth ? dayjs(record.invoice.billingMonth).format('MMM YYYY') : '-',
    },
    {
      title: 'Total Paid', dataIndex: 'totalPaid', key: 'totalPaid',
      render: (value: number) => <Text strong style={{ color: '#52c41a' }}>{formatKES(value)}</Text>,
      align: 'right',
    },
    {
      title: 'Date', dataIndex: 'createdAt', key: 'createdAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_: unknown, record: Receipt) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => receiptsApi.downloadPdf(record.receiptId)}>PDF</Button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (receipt: Receipt) => (
    <Card
      key={receipt.receiptId}
      size="small"
      style={{ marginBottom: 8, cursor: 'pointer' }}
      styles={{ body: { padding: '12px 14px' } }}
      onClick={() => openDetail(receipt)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <Text strong style={{ fontSize: 14, display: 'block' }}>{receipt.receiptNumber}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {receipt.invoice?.billingMonth ? dayjs(receipt.invoice.billingMonth).format('MMM YYYY') : '-'}
          </Text>
        </div>
        <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
          {formatKES(receipt.totalPaid)}
        </Text>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #f5f5f5' }}>
        <div>
          {receipt.invoice?.invoiceNumber && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              Invoice: {receipt.invoice.invoiceNumber}
            </Text>
          )}
          <Text type="secondary" style={{ fontSize: 11 }}>
            {receipt.createdAt ? dayjs(receipt.createdAt).format('DD MMM YYYY') : '-'}
          </Text>
        </div>
        <Button
          type="link"
          icon={<DownloadOutlined />}
          size="small"
          onClick={(e) => { e.stopPropagation(); receiptsApi.downloadPdf(receipt.receiptId); }}
          style={{ padding: 0 }}
        >
          PDF
        </Button>
      </div>
    </Card>
  );

  const renderDetail = () => {
    if (!selectedReceipt) return null;
    const r = selectedReceipt;

    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Text strong style={{ fontSize: 28, color: '#52c41a', display: 'block' }}>
            {formatKES(r.totalPaid)}
          </Text>
          <Text type="secondary">Total Paid</Text>
        </div>

        <Descriptions column={1} size="small" labelStyle={{ fontWeight: 600, width: 120 }}>
          <Descriptions.Item label="Receipt #">{r.receiptNumber}</Descriptions.Item>
          <Descriptions.Item label="Date">
            {r.createdAt ? dayjs(r.createdAt).format('DD MMMM YYYY') : '-'}
          </Descriptions.Item>
          {r.invoice && (
            <>
              <Descriptions.Item label="Invoice #">{r.invoice.invoiceNumber}</Descriptions.Item>
              <Descriptions.Item label="Billing Month">
                {r.invoice.billingMonth ? dayjs(r.invoice.billingMonth).format('MMMM YYYY') : '-'}
              </Descriptions.Item>
            </>
          )}
        </Descriptions>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button
            icon={<DownloadOutlined />}
            block
            size="large"
            onClick={() => receiptsApi.downloadPdf(r.receiptId)}
          >
            Download Receipt PDF
          </Button>
          {r.invoice?.invoiceId && (
            <Button
              block
              size="large"
              onClick={() => invoicesApi.downloadPdf(r.invoice!.invoiceId)}
            >
              Invoice PDF
            </Button>
          )}
        </div>
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
          <FileProtectOutlined style={{ marginRight: 8 }} />
          My Receipts
        </Title>
        <Button
          icon={<ExportOutlined />}
          onClick={handleExport}
          loading={exporting}
          disabled={isLoading || receipts.length === 0}
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
          ) : receipts.length === 0 ? (
            <Empty description="No receipts yet" />
          ) : (
            <>
              {receipts.map(renderMobileCard)}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {receipts.length} of {pagination?.total || 0}
                </Text>
                {(pagination?.total || 0) > receipts.length && (
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
          <Table<Receipt>
            columns={columns}
            dataSource={receipts}
            loading={isLoading}
            rowKey="receiptId"
            locale={{ emptyText: <Empty description="No receipts yet" /> }}
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

      {/* Receipt Detail Drawer */}
      <Drawer
        title="Receipt Details"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedReceipt(null); }}
        width={isMobile ? '100%' : 420}
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '70vh' : undefined}
      >
        {renderDetail()}
      </Drawer>
    </div>
  );
}
