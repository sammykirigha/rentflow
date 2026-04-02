'use client';

import { Card, Table, Tag, Skeleton, Grid, Typography, Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, type ExpiringLease } from '@/lib/api/dashboard.api';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';

const { Text } = Typography;
const { useBreakpoint } = Grid;

function getDaysRemainingColor(days: number): string {
  if (days < 30) return 'red';
  if (days <= 60) return 'orange';
  return 'gold';
}

const STATUS_COLOR: Record<string, string> = {
  active: 'green',
  notice_period: 'orange',
  vacated: 'default',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  notice_period: 'Notice',
  vacated: 'Vacated',
};

export default function LeaseExpiringTable() {
  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [mobileLimit, setMobileLimit] = useState(10);

  const { data: leases, isLoading } = useQuery({
    queryKey: ['dashboard-expiring-leases'],
    queryFn: () => dashboardApi.getExpiringLeases(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card size={isMobile ? 'small' : 'default'}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  const allLeases = leases ?? [];

  const columns: ColumnsType<ExpiringLease> = [
    {
      title: 'Tenant',
      dataIndex: 'tenantName',
      key: 'tenantName',
      ellipsis: true,
    },
    {
      title: 'Unit',
      dataIndex: 'unitNumber',
      key: 'unitNumber',
      width: 100,
    },
    {
      title: 'Property',
      dataIndex: 'propertyName',
      key: 'propertyName',
      ellipsis: true,
      responsive: ['lg'] as any,
    },
    {
      title: 'Lease End',
      dataIndex: 'leaseEnd',
      key: 'leaseEnd',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a: ExpiringLease, b: ExpiringLease) =>
        dayjs(a.leaseEnd).unix() - dayjs(b.leaseEnd).unix(),
    },
    {
      title: 'Days Left',
      dataIndex: 'daysRemaining',
      key: 'daysRemaining',
      width: 100,
      sorter: (a: ExpiringLease, b: ExpiringLease) => a.daysRemaining - b.daysRemaining,
      defaultSortOrder: 'ascend',
      render: (days: number) => (
        <Tag color={getDaysRemainingColor(days)}>
          {days}d
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      responsive: ['md'] as any,
      render: (status: string) => (
        <Tag color={STATUS_COLOR[status] || 'default'}>
          {STATUS_LABEL[status] || status}
        </Tag>
      ),
    },
  ];

  const mobileLeases = allLeases.slice(0, mobileLimit);

  return (
    <Card
      title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Expiring Leases</Text>}
      size={isMobile ? 'small' : 'default'}
    >
      {allLeases.length === 0 ? (
        <Text type="secondary">No leases expiring soon.</Text>
      ) : isMobile ? (
        <div>
          {mobileLeases.map((lease) => (
            <div
              key={lease.tenantId}
              style={{
                padding: '10px 0',
                borderBottom: '1px solid #f5f5f5',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                    {lease.tenantName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {lease.unitNumber} &middot; {lease.propertyName}
                  </Text>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 8 }}>
                  <Tag
                    color={getDaysRemainingColor(lease.daysRemaining)}
                    style={{ margin: 0, fontSize: 11 }}
                  >
                    {lease.daysRemaining}d left
                  </Tag>
                </div>
              </div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 10 }}>
                  Ends: {lease.leaseEnd ? dayjs(lease.leaseEnd).format('DD MMM YYYY') : '-'}
                </Text>
                <Tag
                  color={STATUS_COLOR[lease.status] || 'default'}
                  style={{ fontSize: 10, margin: 0 }}
                >
                  {STATUS_LABEL[lease.status] || lease.status}
                </Tag>
              </div>
            </div>
          ))}
          {allLeases.length > mobileLimit && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <Button size="small" onClick={() => setMobileLimit(mobileLimit + 10)}>
                Load More ({allLeases.length - mobileLimit} remaining)
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Table<ExpiringLease>
          columns={columns}
          dataSource={allLeases}
          rowKey="tenantId"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          size="middle"
        />
      )}
    </Card>
  );
}
