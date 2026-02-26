"use client";

import { useMemo } from 'react';
import { Typography, Table, Tag, Tabs, Empty, Spin, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api/invoices.api';
import { paymentsApi, walletApi } from '@/lib/api/payments.api';
import { formatKES } from '@/lib/format-kes';
import {
  INVOICE_STATUS_COLOR,
  INVOICE_STATUS_LABEL,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_COLOR,
  WALLET_TXN_TYPE_LABEL,
  WALLET_TXN_TYPE_COLOR,
} from '@/lib/constants/status-maps';
import type { Invoice, InvoiceStatus } from '@/types/invoices';
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/payments';
import type { WalletTransaction, WalletTxnType } from '@/types/payments';
import type { Tenant } from '@/types/tenants';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text } = Typography;

interface TenantReconcilePreviewProps {
  tenantId: string | undefined;
  paymentDate: string | undefined;
  isOpen: boolean;
  tenantsList: Tenant[];
}

export default function TenantReconcilePreview({
  tenantId,
  paymentDate,
  isOpen,
  tenantsList,
}: TenantReconcilePreviewProps) {
  const enabled = isOpen && !!tenantId;

  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['recon-preview-invoices', tenantId],
    queryFn: () => invoicesApi.getByTenant(tenantId!, { limit: 20 }),
    enabled,
    staleTime: 30_000,
  });

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['recon-preview-payments', tenantId],
    queryFn: () => paymentsApi.getByTenant(tenantId!, { limit: 20 }),
    enabled,
    staleTime: 30_000,
  });

  const { data: walletData, isLoading: loadingWallet } = useQuery({
    queryKey: ['recon-preview-wallet', tenantId],
    queryFn: () => walletApi.getTransactions(tenantId!, { limit: 20 }),
    enabled,
    staleTime: 30_000,
  });

  const invoices: Invoice[] = Array.isArray(invoicesData?.data) ? invoicesData.data : [];
  const payments: Payment[] = Array.isArray(paymentsData?.data) ? paymentsData.data : [];
  const walletRaw = walletData?.data ?? walletData;
  const walletTxns: WalletTransaction[] = Array.isArray(walletRaw) ? walletRaw : [];

  const tenant = useMemo(
    () => tenantsList.find((t) => t.tenantId === tenantId),
    [tenantsList, tenantId],
  );

  const paymentMonth = paymentDate ? dayjs(paymentDate).format('YYYY-MM') : null;
  const paymentMonthLabel = paymentDate ? dayjs(paymentDate).format('MMMM YYYY') : '';

  // Decision-helper signal
  const decisionSignal = useMemo(() => {
    if (!paymentMonth || invoices.length === 0) return null;

    const monthInvoices = invoices.filter(
      (inv) => dayjs(inv.billingMonth).format('YYYY-MM') === paymentMonth,
    );

    if (monthInvoices.length === 0) return null;

    const allPaid = monthInvoices.every((inv) => inv.status === 'paid');
    if (allPaid) return 'settled' as const;

    const hasUnpaid = monthInvoices.some(
      (inv) => inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'partially_paid',
    );

    // Check if tenant has any completed M-Pesa payment in that month
    const monthPayments = payments.filter((p) => {
      const pMonth = dayjs(p.transactionDate).format('YYYY-MM');
      return pMonth === paymentMonth &&
        p.status === 'completed' &&
        (p.method === 'mpesa_paybill' || p.method === 'mpesa_stk_push');
    });

    if (hasUnpaid && monthPayments.length === 0) return 'likely_payer' as const;

    return null;
  }, [paymentMonth, invoices, payments]);

  if (!tenantId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
        <Empty description="Select a tenant to view their financial history" />
      </div>
    );
  }

  const isLoading = loadingInvoices || loadingPayments || loadingWallet;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
        <Spin />
      </div>
    );
  }

  const fullName = tenant
    ? `${tenant.user?.firstName || ''} ${tenant.user?.lastName || ''}`.trim()
    : '';

  const invoiceColumns: ColumnsType<Invoice> = [
    {
      title: 'Billing Month',
      dataIndex: 'billingMonth',
      key: 'billingMonth',
      render: (value: string) => value ? dayjs(value).format('MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.billingMonth).getTime() - new Date(b.billingMonth).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (value: number) => formatKES(value),
      align: 'right',
    },
    {
      title: 'Balance Due',
      dataIndex: 'balanceDue',
      key: 'balanceDue',
      render: (value: number) => (
        <Text type={value > 0 ? 'danger' : 'success'}>{formatKES(value)}</Text>
      ),
      align: 'right',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: InvoiceStatus) => (
        <Tag color={INVOICE_STATUS_COLOR[status] || 'default'}>
          {INVOICE_STATUS_LABEL[status] || status}
        </Tag>
      ),
    },
  ];

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
      render: (method: PaymentMethod) => (
        <Tag color={PAYMENT_METHOD_COLOR[method] || 'default'}>
          {PAYMENT_METHOD_LABEL[method] || method}
        </Tag>
      ),
    },
    {
      title: 'Receipt #',
      dataIndex: 'mpesaReceiptNumber',
      key: 'mpesaReceiptNumber',
      render: (value: string) => value || '-',
      ellipsis: true,
    },
  ];

  const walletColumns: ColumnsType<WalletTransaction> = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
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
      render: (value: number, record: WalletTransaction) => (
        <Text type={record.type === 'credit' || record.type === 'credit_reconciliation' || record.type === 'refund' ? 'success' : 'danger'}>
          {record.type === 'credit' || record.type === 'credit_reconciliation' || record.type === 'refund' ? '+' : '-'}{formatKES(value)}
        </Text>
      ),
      align: 'right',
    },
    {
      title: 'Balance After',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (value: number) => formatKES(value),
      align: 'right',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      {tenant && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
          <Text strong>{fullName}</Text>
          {tenant.unit?.unitNumber && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              Unit {tenant.unit.unitNumber}
            </Text>
          )}
          {tenant.unit?.property?.name && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              ({tenant.unit.property.name})
            </Text>
          )}
          <div style={{ marginTop: 4 }}>
            <Text type="secondary">Wallet: </Text>
            <Text strong style={{ color: '#1890ff' }}>{formatKES(tenant.walletBalance ?? 0)}</Text>
          </div>
        </div>
      )}

      {/* Decision Banner */}
      {decisionSignal === 'likely_payer' && (
        <Alert
          type="warning"
          showIcon
          message={`No M-Pesa payment found for ${paymentMonthLabel}. This tenant likely made the misrouted payment.`}
          style={{ marginBottom: 12 }}
        />
      )}
      {decisionSignal === 'settled' && (
        <Alert
          type="success"
          showIcon
          message={`Invoices for ${paymentMonthLabel} appear settled. This tenant is less likely to be the payer.`}
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Tabs */}
      <Tabs
        size="small"
        defaultActiveKey="invoices"
        items={[
          {
            key: 'invoices',
            label: `Invoices (${invoices.length})`,
            children: (
              <Table<Invoice>
                size="small"
                columns={invoiceColumns}
                dataSource={invoices}
                rowKey="invoiceId"
                pagination={{ pageSize: 5, size: 'small' }}
                rowClassName={(record) => {
                  if (paymentMonth && dayjs(record.billingMonth).format('YYYY-MM') === paymentMonth) {
                    return 'recon-highlight-row';
                  }
                  return '';
                }}
              />
            ),
          },
          {
            key: 'payments',
            label: `Payments (${payments.length})`,
            children: (
              <Table<Payment>
                size="small"
                columns={paymentColumns}
                dataSource={payments}
                rowKey="paymentId"
                pagination={{ pageSize: 5, size: 'small' }}
              />
            ),
          },
          {
            key: 'wallet',
            label: `Wallet (${walletTxns.length})`,
            children: (
              <Table<WalletTransaction>
                size="small"
                columns={walletColumns}
                dataSource={walletTxns}
                rowKey="walletTransactionId"
                pagination={{ pageSize: 5, size: 'small' }}
              />
            ),
          },
        ]}
      />

      {/* Inline style for row highlight */}
      <style jsx global>{`
        .recon-highlight-row td {
          background-color: #fafafa !important;
        }
      `}</style>
    </div>
  );
}
