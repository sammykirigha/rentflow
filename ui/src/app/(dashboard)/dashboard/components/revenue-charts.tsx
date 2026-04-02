'use client';

import { Card, Col, Row, Skeleton, Grid, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Line, Bar } from '@ant-design/charts';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, type MonthlyRevenue } from '@/lib/api/dashboard.api';
import { formatKES } from '@/lib/format-kes';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface RevenueLineData {
  month: string;
  value: number;
  type: string;
}

export default function RevenueCharts() {
  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => dashboardApi.getAnalytics(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Row gutter={isMobile ? [8, 8] : [16, 16]}>
        <Col xs={24} lg={12}>
          <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
        </Col>
        <Col xs={24}>
          <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
        </Col>
      </Row>
    );
  }

  // Transform monthly revenue data for multi-line chart (revenue + target)
  const revenueLineData: RevenueLineData[] = (analytics?.monthlyRevenue ?? []).flatMap(
    (item: MonthlyRevenue) => [
      { month: item.month, value: item.revenue, type: 'Revenue' },
      { month: item.month, value: item.target, type: 'Target' },
    ]
  );

  const revenueLineConfig = {
    data: revenueLineData,
    xField: 'month',
    yField: 'value',
    colorField: 'type',
    style: {
      lineWidth: 2,
    },
    scale: {
      color: {
        range: ['#1890ff', '#d9d9d9'],
      },
    },
    axis: {
      y: {
        labelFormatter: (v: number) => formatKES(v),
      },
    },
    tooltip: {
      items: [
        {
          channel: 'y',
          valueFormatter: (v: number) => formatKES(v),
        },
      ],
    },
    legend: {
      position: 'top' as const,
    },
  };

  const collectionRateConfig = {
    data: analytics?.collectionRate ?? [],
    xField: 'month',
    yField: 'rate',
    style: {
      lineWidth: 2,
      stroke: '#52c41a',
    },
    axis: {
      y: {
        labelFormatter: (v: number) => `${v}%`,
        min: 0,
        max: 100,
      },
    },
    tooltip: {
      items: [
        {
          channel: 'y',
          valueFormatter: (v: number) => `${v}%`,
        },
      ],
    },
  };

  const revenueByPropertyConfig = {
    data: analytics?.revenueByProperty ?? [],
    xField: 'property',
    yField: 'revenue',
    style: {
      fill: '#1890ff',
      radiusTopRight: 4,
      radiusBottomRight: 4,
    },
    axis: {
      x: {
        labelFormatter: (v: string) => v.length > (isMobile ? 12 : 20) ? v.slice(0, isMobile ? 12 : 20) + '…' : v,
      },
      y: {
        labelFormatter: (v: number) => formatKES(v),
      },
    },
    tooltip: {
      items: [
        {
          channel: 'y',
          valueFormatter: (v: number) => formatKES(v),
        },
      ],
    },
  };

  return (
    <Row gutter={isMobile ? [8, 8] : [16, 16]}>
      <Col xs={24} lg={12}>
        <Card
          title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Monthly Revenue</Text>}
          size={isMobile ? 'small' : 'default'}
          style={{ marginBottom: isMobile ? 8 : 16 }}
        >
          <Line {...revenueLineConfig} height={isMobile ? 200 : 300} />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card
          title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Collection Rate</Text>}
          size={isMobile ? 'small' : 'default'}
          style={{ marginBottom: isMobile ? 8 : 16 }}
        >
          <Line {...collectionRateConfig} height={isMobile ? 200 : 300} />
        </Card>
      </Col>
      <Col xs={24}>
        <Card
          title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Revenue by Property</Text>}
          size={isMobile ? 'small' : 'default'}
          style={{ marginBottom: isMobile ? 8 : 16 }}
        >
          <Bar {...revenueByPropertyConfig} height={isMobile ? 200 : 300} />
        </Card>
      </Col>
    </Row>
  );
}
