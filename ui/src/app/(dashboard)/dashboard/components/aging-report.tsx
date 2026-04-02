'use client';

import { Card, Col, Row, Table, Tag, Skeleton, Grid, Typography, Statistic, Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, type AgingDetail } from '@/lib/api/dashboard.api';
import { formatKES } from '@/lib/format-kes';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const BUCKET_COLORS: Record<string, string> = {
  '0-30': '#52c41a',
  '31-60': '#faad14',
  '61-90': '#fa8c16',
  '90+': '#ff4d4f',
};

const BUCKET_BG_COLORS: Record<string, string> = {
  '0-30': '#f6ffed',
  '31-60': '#fffbe6',
  '61-90': '#fff7e6',
  '90+': '#fff2f0',
};

export default function AgingReport() {
  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [mobileLimit, setMobileLimit] = useState(10);

  const { data: agingReport, isLoading } = useQuery({
    queryKey: ['dashboard-aging-report'],
    queryFn: () => dashboardApi.getAgingReport(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div>
        <Row gutter={isMobile ? [8, 8] : [16, 16]} style={{ marginBottom: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={12} sm={6} key={i}>
              <Card size="small"><Skeleton active paragraph={{ rows: 1 }} /></Card>
            </Col>
          ))}
        </Row>
        <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
      </div>
    );
  }

  const summaryBuckets = ['0-30', '31-60', '61-90', '90+'];
  const summaryMap = new Map(
    (agingReport?.summary ?? []).map((b) => [b.bucket, b])
  );

  const details = agingReport?.details ?? [];

  const columns: ColumnsType<AgingDetail> = [
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
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      responsive: ['lg'] as any,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      responsive: ['md'] as any,
    },
    {
      title: 'Balance',
      dataIndex: 'balanceDue',
      key: 'balanceDue',
      render: (value: number) => formatKES(value),
      align: 'right',
      sorter: (a: AgingDetail, b: AgingDetail) => a.balanceDue - b.balanceDue,
    },
    {
      title: 'Age',
      dataIndex: 'ageDays',
      key: 'ageDays',
      width: 80,
      sorter: (a: AgingDetail, b: AgingDetail) => a.ageDays - b.ageDays,
      defaultSortOrder: 'descend',
      render: (days: number) => `${days}d`,
    },
    {
      title: 'Bucket',
      dataIndex: 'bucket',
      key: 'bucket',
      width: 100,
      render: (bucket: string) => (
        <Tag color={BUCKET_COLORS[bucket] || 'default'}>{bucket}</Tag>
      ),
      filters: summaryBuckets.map((b) => ({ text: `${b} days`, value: b })),
      onFilter: (value, record) => record.bucket === value,
    },
  ];

  const mobileDetails = details.slice(0, mobileLimit);

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={isMobile ? [8, 8] : [16, 16]} style={{ marginBottom: isMobile ? 8 : 16 }}>
        {summaryBuckets.map((bucket) => {
          const data = summaryMap.get(bucket);
          return (
            <Col xs={12} sm={6} key={bucket}>
              <Card
                size="small"
                style={{
                  borderTop: `3px solid ${BUCKET_COLORS[bucket]}`,
                  backgroundColor: BUCKET_BG_COLORS[bucket],
                }}
                styles={{ body: { padding: isMobile ? 10 : 16 } }}
              >
                <Statistic
                  title={
                    <Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>
                      {bucket} days
                    </Text>
                  }
                  value={data?.count ?? 0}
                  valueStyle={{ fontSize: isMobile ? 18 : 24, color: BUCKET_COLORS[bucket] }}
                  suffix={
                    <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>
                      inv.
                    </Text>
                  }
                />
                <Text style={{ fontSize: isMobile ? 11 : 13, color: BUCKET_COLORS[bucket] }}>
                  {formatKES(data?.totalAmount ?? 0)}
                </Text>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Detail — Mobile cards or Desktop table */}
      {isMobile ? (
        <div>
          {mobileDetails.length === 0 ? (
            <Card size="small"><Text type="secondary">No outstanding invoices found.</Text></Card>
          ) : (
            <>
              {mobileDetails.map((item, idx) => (
                <Card
                  key={`${item.invoiceNumber}-${idx}`}
                  size="small"
                  style={{ marginBottom: 8 }}
                  styles={{ body: { padding: '10px 12px' } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                        {item.tenantName}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {item.unitNumber} &middot; {item.propertyName}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 8 }}>
                      <Text strong style={{ fontSize: 14, display: 'block' }}>
                        {formatKES(item.balanceDue)}
                      </Text>
                      <Tag
                        color={BUCKET_COLORS[item.bucket] || 'default'}
                        style={{ margin: 0, fontSize: 10 }}
                      >
                        {item.ageDays}d &middot; {item.bucket}
                      </Tag>
                    </div>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {item.invoiceNumber}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      Due: {item.dueDate ? dayjs(item.dueDate).format('DD MMM YYYY') : '-'}
                    </Text>
                  </div>
                </Card>
              ))}
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {mobileDetails.length} of {details.length}
                </Text>
                {details.length > mobileLimit && (
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" onClick={() => setMobileLimit(mobileLimit + 10)}>
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <Card
          title={<Text strong style={{ fontSize: 16 }}>Aging Details</Text>}
        >
          <Table<AgingDetail>
            columns={columns}
            dataSource={details}
            rowKey={(record) => `${record.invoiceNumber}-${record.tenantName}`}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
          />
        </Card>
      )}
    </div>
  );
}
