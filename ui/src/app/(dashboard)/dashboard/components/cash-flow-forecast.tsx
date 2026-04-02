'use client';

import { Card, Skeleton, Grid, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Area } from '@ant-design/charts';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, type CashFlowMonth } from '@/lib/api/dashboard.api';
import { formatKES } from '@/lib/format-kes';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface CashFlowChartData {
  month: string;
  value: number;
  type: string;
}

export default function CashFlowForecast() {
  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data: forecast, isLoading } = useQuery({
    queryKey: ['dashboard-cash-flow-forecast'],
    queryFn: () => dashboardApi.getCashFlowForecast(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  const months = forecast?.months ?? [];

  const hasNegativeNet = months.some(
    (m: CashFlowMonth) => m.projectedNet < 0
  );

  // Transform data for multi-series area chart
  const chartData: CashFlowChartData[] = months.flatMap((item: CashFlowMonth) => [
    { month: item.month, value: item.projectedCollection, type: 'Projected Collection' },
    { month: item.month, value: item.projectedExpenses, type: 'Projected Expenses' },
    { month: item.month, value: item.projectedNet, type: 'Projected Net' },
  ]);

  const areaConfig = {
    data: chartData,
    xField: 'month',
    yField: 'value',
    colorField: 'type',
    style: {
      fillOpacity: 0.3,
    },
    scale: {
      color: {
        range: ['#52c41a', '#ff4d4f', '#1890ff'],
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

  return (
    <Card
      title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Cash Flow Forecast</Text>}
      size={isMobile ? 'small' : 'default'}
    >
      {hasNegativeNet && (
        <div style={{ marginBottom: 12 }}>
          <Text type="warning" style={{ color: '#fa8c16', fontSize: isMobile ? 12 : 14 }}>
            Warning: Projected net cash flow is negative in one or more months. Review expenses and expected revenue.
          </Text>
        </div>
      )}
      {months.length > 0 ? (
        <Area {...areaConfig} height={isMobile ? 220 : 350} />
      ) : (
        <Text type="secondary">No forecast data available.</Text>
      )}
    </Card>
  );
}
