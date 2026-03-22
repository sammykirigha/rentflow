"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Typography,
  Statistic,
  Tag,
  Button,
  Grid,
  Spin,
  Empty,
} from "antd";
import {
  WalletOutlined,
  FileTextOutlined,
  WarningOutlined,
  CalendarOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStore } from "@/stores/user.store";
import { invoicesApi } from "@/lib/api/invoices.api";
import { walletApi } from "@/lib/api/payments.api";
import settingsApi from "@/lib/api/settings.api";
import { formatKES } from "@/lib/format-kes";
import type { Invoice } from "@/types/invoices";
import Link from "next/link";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const STATUS_COLOR_MAP: Record<string, string> = {
  paid: "green",
  partially_paid: "blue",
  unpaid: "orange",
  overdue: "red",
  cancelled: "default",
};

const STATUS_LABEL_MAP: Record<string, string> = {
  paid: "Paid",
  partially_paid: "Partially Paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export default function TenantDashboardPage() {
  const { isAuthenticated } = useAuth();
  const user = useUserStore((state) => state.user);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['my-wallet-balance'],
    queryFn: () => walletApi.getMyBalance().catch(() => ({ walletBalance: 0 })),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  const { data: invoiceData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['my-invoices-recent'],
    queryFn: () => invoicesApi.getMy({ limit: 5 }).catch(() => ({ data: [] })),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsApi.getSettings().catch(() => null),
    enabled: isAuthenticated,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const loading = balanceLoading || invoicesLoading;
  const walletBalance = balanceData?.walletBalance ?? 0;
  const recentInvoices: Invoice[] = Array.isArray(invoiceData?.data) ? invoiceData.data : [];

  const { totalOutstanding, overdueCount } = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    recentInvoices.forEach((inv) => {
      if (inv.status !== "paid" && inv.status !== "cancelled") {
        outstanding += Number(inv.balanceDue) || 0;
      }
      if (inv.status === "overdue") {
        overdue++;
      }
    });
    return { totalOutstanding: outstanding, overdueCount: overdue };
  }, [recentInvoices]);

  const contactInfo = useMemo(() => {
    if (!settingsData) return {};
    return {
      phone: settingsData.contactPhone,
      email: settingsData.supportEmail,
      address: settingsData.contactAddress,
      name: settingsData.platformName,
    };
  }, [settingsData]);

  const firstName = user?.firstName || "Tenant";
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }} role="status" aria-label="Loading dashboard">
        <Spin size="large" />
      </div>
    );
  }

  const nextDueInvoice = recentInvoices.find(
    (i) => i.status === "unpaid" || i.status === "partially_paid" || i.status === "overdue"
  );

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          {greeting}, {firstName}
        </Title>
        <Text type="secondary">Here&apos;s your rental summary</Text>
      </div>

      {/* Status Banner */}
      {overdueCount > 0 ? (
        <Card
          size="small"
          style={{ marginBottom: isMobile ? 8 : 16, background: '#fff2f0', borderColor: '#ffccc7' }}
          styles={{ body: { padding: isMobile ? '10px 12px' : '12px 16px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
            <div>
              <Text strong style={{ color: '#cf1322' }}>
                {overdueCount} overdue invoice{overdueCount > 1 ? 's' : ''}
              </Text>
              <Text style={{ color: '#cf1322', display: 'block', fontSize: 12 }}>
                Outstanding: {formatKES(totalOutstanding)}
              </Text>
            </div>
            <Link href="/tenant/invoices?status=overdue" style={{ marginLeft: 'auto' }}>
              <Button type="primary" danger size="small">View</Button>
            </Link>
          </div>
        </Card>
      ) : totalOutstanding > 0 ? (
        <Card
          size="small"
          style={{ marginBottom: isMobile ? 8 : 16, background: '#fffbe6', borderColor: '#ffe58f' }}
          styles={{ body: { padding: isMobile ? '10px 12px' : '12px 16px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ color: '#d48806', fontSize: 18 }} />
            <div>
              <Text strong style={{ color: '#d48806' }}>Payment due</Text>
              <Text style={{ color: '#d48806', display: 'block', fontSize: 12 }}>
                {formatKES(totalOutstanding)} outstanding
              </Text>
            </div>
            <Link href="/tenant/invoices" style={{ marginLeft: 'auto' }}>
              <Button size="small">View</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card
          size="small"
          style={{ marginBottom: isMobile ? 8 : 16, background: '#f6ffed', borderColor: '#b7eb8f' }}
          styles={{ body: { padding: isMobile ? '10px 12px' : '12px 16px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            <Text strong style={{ color: '#389e0d' }}>All caught up! No outstanding payments.</Text>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
        gap: isMobile ? 8 : 16,
        marginBottom: isMobile ? 12 : 20,
      }}>
        <Card size="small" styles={{ body: { padding: isMobile ? 12 : 16 } }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>Wallet Balance</Text>}
            value={walletBalance}
            formatter={(val) => formatKES(Number(val))}
            prefix={<WalletOutlined />}
            valueStyle={{ fontSize: isMobile ? 16 : 20, color: walletBalance > 0 ? '#52c41a' : undefined }}
          />
        </Card>
        <Card size="small" styles={{ body: { padding: isMobile ? 12 : 16 } }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>Outstanding</Text>}
            value={totalOutstanding}
            formatter={(val) => formatKES(Number(val))}
            prefix={<FileTextOutlined />}
            valueStyle={{ fontSize: isMobile ? 16 : 20, color: totalOutstanding > 0 ? '#ff4d4f' : '#52c41a' }}
          />
        </Card>
        {!isMobile && nextDueInvoice && (
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Next Due Date</Text>}
              value={nextDueInvoice.dueDate ? dayjs(nextDueInvoice.dueDate).format('DD MMM YYYY') : 'N/A'}
              prefix={<CalendarOutlined />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
        gap: isMobile ? 8 : 12,
        marginBottom: isMobile ? 12 : 20,
      }}>
        <Link href="/tenant/wallet">
          <Button
            block
            icon={<PlusOutlined />}
            style={{ height: isMobile ? 44 : 48, fontSize: isMobile ? 12 : 14 }}
          >
            Top Up Wallet
          </Button>
        </Link>
        <Link href="/tenant/invoices">
          <Button
            block
            icon={<FileTextOutlined />}
            style={{ height: isMobile ? 44 : 48, fontSize: isMobile ? 12 : 14 }}
          >
            View Invoices
          </Button>
        </Link>
        <Link href="/tenant/maintenance">
          <Button
            block
            icon={<PlusOutlined />}
            style={{ height: isMobile ? 44 : 48, fontSize: isMobile ? 12 : 14 }}
          >
            Report Issue
          </Button>
        </Link>
        <Link href="/tenant/receipts">
          <Button
            block
            icon={<ArrowRightOutlined />}
            style={{ height: isMobile ? 44 : 48, fontSize: isMobile ? 12 : 14 }}
          >
            My Receipts
          </Button>
        </Link>
      </div>

      {/* Recent Invoices */}
      <Card
        title="Recent Invoices"
        size="small"
        style={{ marginBottom: isMobile ? 12 : 20 }}
        extra={<Link href="/tenant/invoices"><Button type="link" size="small">View All</Button></Link>}
      >
        {recentInvoices.length === 0 ? (
          <Empty description="No invoices yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          recentInvoices.map((inv) => (
            <div
              key={inv.invoiceId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid #f5f5f5',
              }}
            >
              <div>
                <Text strong style={{ fontSize: 13, display: 'block' }}>{inv.invoiceNumber}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {inv.billingMonth ? dayjs(inv.billingMonth).format('MMM YYYY') : '-'}
                  {inv.dueDate && ` · Due ${dayjs(inv.dueDate).format('DD MMM')}`}
                </Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text strong style={{
                  fontSize: 14,
                  display: 'block',
                  color: Number(inv.balanceDue) > 0 ? '#ff4d4f' : '#52c41a',
                }}>
                  {Number(inv.balanceDue) > 0 ? formatKES(inv.balanceDue) : formatKES(inv.totalAmount)}
                </Text>
                <Tag
                  color={STATUS_COLOR_MAP[inv.status] || 'default'}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  {STATUS_LABEL_MAP[inv.status] || inv.status}
                </Tag>
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Contact Support */}
      {(contactInfo.phone || contactInfo.email) && (
        <Card
          title={<span><CustomerServiceOutlined style={{ marginRight: 8 }} />Contact Support</span>}
          size="small"
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 8 : 16,
          }}>
            {contactInfo.phone && (
              <a href={`tel:${contactInfo.phone}`} style={{ textDecoration: 'none' }}>
                <Card
                  size="small"
                  hoverable
                  styles={{ body: { padding: isMobile ? '10px 12px' : '12px 16px' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <PhoneOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Call Us</Text>
                      <Text strong style={{ fontSize: 14 }}>{contactInfo.phone}</Text>
                    </div>
                  </div>
                </Card>
              </a>
            )}
            {contactInfo.email && (
              <a href={`mailto:${contactInfo.email}`} style={{ textDecoration: 'none' }}>
                <Card
                  size="small"
                  hoverable
                  styles={{ body: { padding: isMobile ? '10px 12px' : '12px 16px' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MailOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Email Us</Text>
                      <Text strong style={{ fontSize: 14 }}>{contactInfo.email}</Text>
                    </div>
                  </div>
                </Card>
              </a>
            )}
          </div>
          {contactInfo.address && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              {contactInfo.address}
            </Text>
          )}
        </Card>
      )}
    </div>
  );
}
