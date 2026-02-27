"use client";

import { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Tag,
  Card,
  Select,
  DatePicker,
  Modal,
  App,
  Space,
} from 'antd';
import {
  WalletOutlined,
  DownloadOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { walletApi } from '@/lib/api/payments.api';
import { tenantsApi } from '@/lib/api/tenants.api';
import { formatKES } from '@/lib/format-kes';
import { WALLET_TXN_TYPE_LABEL, WALLET_TXN_TYPE_COLOR } from '@/lib/constants/status-maps';
import type { LedgerTransaction, WalletTxnType } from '@/types/payments';
import type { Tenant } from '@/types/tenants';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;


export default function WalletLedgerPage() {
  const { message } = App.useApp();
  const { isAuthenticated } = useAuth();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterTenantId, setFilterTenantId] = useState<string | undefined>(undefined);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterDateRange, setFilterDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [statementTenantId, setStatementTenantId] = useState<string | null>(null);
  const [statementTenantName, setStatementTenantName] = useState('');
  const [statementDateRange, setStatementDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [downloading, setDownloading] = useState(false);

  const startDate = filterDateRange?.[0]?.format('YYYY-MM-DD');
  const endDate = filterDateRange?.[1]?.format('YYYY-MM-DD');

  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['wallet-ledger', page, pageSize, filterTenantId, filterType, startDate, endDate],
    queryFn: () =>
      walletApi.getLedger({
        page,
        limit: pageSize,
        tenantId: filterTenantId,
        type: filterType,
        startDate,
        endDate,
      }),
    enabled: isAuthenticated,
  });

  const transactions: LedgerTransaction[] = Array.isArray(ledgerData?.data) ? ledgerData.data : [];
  const pagination = ledgerData?.pagination;

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: () => tenantsApi.getAll({ limit: 200 }),
    enabled: isAuthenticated,
  });

  const tenantsList: Tenant[] = Array.isArray(tenantsData?.data) ? tenantsData.data : [];

  const openStatementModal = (tenantId: string, tenantName: string) => {
    setStatementTenantId(tenantId);
    setStatementTenantName(tenantName);
    setStatementDateRange(null);
    setStatementModalOpen(true);
  };

  const handleDownloadStatement = async () => {
    if (!statementTenantId) return;
    setDownloading(true);
    try {
      await walletApi.downloadStatement(statementTenantId, {
        startDate: statementDateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: statementDateRange?.[1]?.format('YYYY-MM-DD'),
      });
      message.success('Statement downloaded');
      setStatementModalOpen(false);
    } catch {
      message.error('Failed to download statement');
    } finally {
      setDownloading(false);
    }
  };

  const columns: ColumnsType<LedgerTransaction> = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => (value ? dayjs(value).format('DD MMM YYYY, HH:mm') : '-'),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Tenant',
      key: 'tenant',
      render: (_: unknown, record: LedgerTransaction) => {
        const firstName = record.tenant?.user?.firstName || '';
        const lastName = record.tenant?.user?.lastName || '';
        const unitNumber = record.tenant?.unit?.unitNumber;
        const name = `${firstName} ${lastName}`.trim() || '-';
        return (
          <div>
            <div>{name}</div>
            {unitNumber && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {unitNumber}
                {record.tenant?.unit?.property?.name ? ` - ${record.tenant.unit.property.name}` : ''}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: WalletTxnType) => (
        <Tag color={WALLET_TXN_TYPE_COLOR[type] || 'default'}>
          {WALLET_TXN_TYPE_LABEL[type] || type}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number, record: LedgerTransaction) => {
        const isCredit = record.type === 'credit' || record.type === 'credit_reconciliation' || record.type === 'refund';
        return (
          <Text type={isCredit ? 'success' : 'danger'}>
            {isCredit ? '+' : '-'}
            {formatKES(value)}
          </Text>
        );
      },
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Balance After',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (value: number) => formatKES(value),
      align: 'right',
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (value: string) => value || '-',
      ellipsis: true,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (value: string) => value || '-',
      ellipsis: true,
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      render: (_: unknown, record: LedgerTransaction) => {
        const firstName = record.tenant?.user?.firstName || '';
        const lastName = record.tenant?.user?.lastName || '';
        const tenantName = `${firstName} ${lastName}`.trim() || 'Tenant';
        return (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => openStatementModal(record.tenantId, tenantName)}
          >
            Statement
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          <WalletOutlined style={{ marginRight: 8 }} />
          Wallet Ledger
        </Title>
        <Button
          icon={<ExportOutlined />}
          onClick={() => {
            const csvColumns: CsvColumn<LedgerTransaction>[] = [
              { header: 'Date', accessor: (r) => r.createdAt ? dayjs(r.createdAt).format('DD MMM YYYY, HH:mm') : '' },
              { header: 'Tenant', accessor: (r) => `${r.tenant?.user?.firstName || ''} ${r.tenant?.user?.lastName || ''}`.trim() },
              { header: 'Unit', accessor: (r) => r.tenant?.unit?.unitNumber || '' },
              { header: 'Property', accessor: (r) => r.tenant?.unit?.property?.name || '' },
              { header: 'Type', accessor: (r) => WALLET_TXN_TYPE_LABEL[r.type] || r.type },
              { header: 'Amount', accessor: (r) => Number(r.amount) },
              { header: 'Balance After', accessor: (r) => Number(r.balanceAfter) },
              { header: 'Reference', accessor: (r) => r.reference || '' },
              { header: 'Description', accessor: (r) => r.description || '' },
            ];
            downloadCsv(transactions, csvColumns, 'wallet-ledger.csv');
          }}
          disabled={isLoading || transactions.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Select
            placeholder="Filter by tenant"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 240 }}
            value={filterTenantId}
            onChange={(value) => {
              setFilterTenantId(value);
              setPage(1);
            }}
            options={tenantsList.map((t) => ({
              label:
                `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim() +
                (t.unit?.unitNumber ? ` (${t.unit.unitNumber})` : ''),
              value: t.tenantId,
            }))}
          />
          <Select
            placeholder="Filter by type"
            allowClear
            style={{ width: 180 }}
            value={filterType}
            onChange={(value) => {
              setFilterType(value);
              setPage(1);
            }}
            options={[
              { label: 'Credit', value: 'credit' },
              { label: 'Reconciled Payment', value: 'credit_reconciliation' },
              { label: 'Invoice Deduction', value: 'debit_invoice' },
              { label: 'Penalty Deduction', value: 'debit_penalty' },
              { label: 'Refund', value: 'refund' },
            ]}
          />
          <RangePicker
            value={filterDateRange}
            onChange={(dates) => {
              setFilterDateRange(dates as [Dayjs, Dayjs] | null);
              setPage(1);
            }}
          />
        </Space>
      </Card>

      <Card>
        <Table<LedgerTransaction>
          columns={columns}
          dataSource={transactions}
          loading={isLoading}
          rowKey="walletTransactionId"
          pagination={{
            current: page,
            pageSize,
            total: pagination?.total || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} transactions`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <Modal
        title={`Download Statement - ${statementTenantName}`}
        open={statementModalOpen}
        onOk={handleDownloadStatement}
        onCancel={() => setStatementModalOpen(false)}
        confirmLoading={downloading}
        okText="Download PDF"
      >
        <div style={{ marginTop: 16 }}>
          <Text>Select a date range for the statement (optional):</Text>
          <div style={{ marginTop: 12 }}>
            <RangePicker
              style={{ width: '100%' }}
              value={statementDateRange}
              onChange={(dates) => setStatementDateRange(dates as [Dayjs, Dayjs] | null)}
            />
          </div>
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            Leave empty to include all transactions.
          </Text>
        </div>
      </Modal>
    </div>
  );
}
