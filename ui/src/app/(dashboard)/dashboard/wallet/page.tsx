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
  Grid,
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
const { useBreakpoint } = Grid;


export default function WalletLedgerPage() {
  const { message } = App.useApp();
  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterTenantId, setFilterTenantId] = useState<string | undefined>(undefined);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterDateRange, setFilterDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const getTenantName = (record: LedgerTransaction) => {
    const firstName = record.tenant?.user?.firstName || '';
    const lastName = record.tenant?.user?.lastName || '';
    return `${firstName} ${lastName}`.trim() || '-';
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
        const unitNumber = record.tenant?.unit?.unitNumber;
        const name = getTenantName(record);
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
        const tenantName = getTenantName(record);
        return (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => openStatementModal(record.tenantId, tenantName === '-' ? 'Tenant' : tenantName)}
          >
            Statement
          </Button>
        );
      },
    },
  ];

  const renderMobileTransactionCard = (txn: LedgerTransaction) => {
    const isCredit = txn.type === 'credit' || txn.type === 'credit_reconciliation' || txn.type === 'refund';
    const tenantName = getTenantName(txn);
    const unitNumber = txn.tenant?.unit?.unitNumber;
    return (
      <Card key={txn.walletTransactionId} size="small" style={{ marginBottom: 8 }} styles={{ body: { padding: '12px 14px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>{tenantName}</Text>
            {unitNumber && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {unitNumber}
                {txn.tenant?.unit?.property?.name ? ` - ${txn.tenant.unit.property.name}` : ''}
              </Text>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text strong style={{ fontSize: 14, display: 'block', color: isCredit ? '#52c41a' : '#ff4d4f' }}>
              {isCredit ? '+' : '-'}{formatKES(txn.amount)}
            </Text>
            <Tag color={WALLET_TXN_TYPE_COLOR[txn.type] || 'default'} style={{ margin: 0, fontSize: 10 }}>
              {WALLET_TXN_TYPE_LABEL[txn.type] || txn.type}
            </Tag>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {txn.createdAt ? dayjs(txn.createdAt).format('DD MMM YY, HH:mm') : '-'}
            {txn.reference && ` · ${txn.reference}`}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>Bal: {formatKES(txn.balanceAfter)}</Text>
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              style={{ padding: 0, fontSize: 11, height: 'auto' }}
              onClick={() => openStatementModal(txn.tenantId, tenantName === '-' ? 'Tenant' : tenantName)}
            />
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 8 : 0,
          marginBottom: isMobile ? 12 : 24,
        }}
      >
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          <WalletOutlined style={{ marginRight: 8 }} />
          Wallet Ledger
        </Title>
        <Button
          icon={<ExportOutlined />}
          onClick={async () => {
            setExporting(true);
            try {
              const all = await walletApi.getLedger({ limit: 10000, tenantId: filterTenantId, type: filterType, startDate, endDate });
              const allData: LedgerTransaction[] = Array.isArray(all?.data) ? all.data : [];
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
              downloadCsv(allData, csvColumns, 'wallet-ledger.csv');
            } finally {
              setExporting(false);
            }
          }}
          loading={exporting}
          disabled={isLoading || transactions.length === 0}
          size={isMobile ? 'small' : 'middle'}
        >
          {!isMobile && 'Export CSV'}
        </Button>
      </div>

      <Card style={{ marginBottom: isMobile ? 8 : 16 }} size={isMobile ? 'small' : 'default'}>
        <Space wrap size={isMobile ? 'small' : 'middle'} style={{ width: '100%' }}>
          <Select
            placeholder="Filter by tenant"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: isMobile ? '100%' : 240, minWidth: isMobile ? undefined : 240 }}
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
            style={{ width: isMobile ? '100%' : 180, minWidth: isMobile ? undefined : 180 }}
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
            style={isMobile ? { width: '100%' } : undefined}
          />
        </Space>
      </Card>

      {isMobile ? (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">Loading...</Text></div>
          ) : transactions.length === 0 ? (
            <Card><Text type="secondary">No transactions found.</Text></Card>
          ) : (
            <>
              {transactions.map(renderMobileTransactionCard)}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {transactions.length} of {pagination?.total || 0}
                </Text>
                {(pagination?.total || 0) > transactions.length && (
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" onClick={() => setPageSize(pageSize + 20)}>Load More</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
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
      )}

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
