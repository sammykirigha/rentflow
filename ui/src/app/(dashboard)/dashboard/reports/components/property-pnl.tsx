'use client';

import { useState } from 'react';
import { Card, Table, DatePicker, Skeleton, Grid, Typography, Button } from 'antd';
import { Column } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, type PropertyPnlItem } from '@/lib/api/dashboard.api';
import { formatKES } from '@/lib/format-kes';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { useBreakpoint } = Grid;

type RangeValue = [Dayjs | null, Dayjs | null] | null;

interface ChartDataItem {
  property: string;
  type: 'Revenue' | 'Expenses';
  value: number;
}

export default function PropertyPnl() {
  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [dateRange, setDateRange] = useState<RangeValue>(null);

  const startDate = dateRange?.[0]?.format('YYYY-MM-DD');
  const endDate = dateRange?.[1]?.format('YYYY-MM-DD');

  const { data: report, isLoading } = useQuery({
    queryKey: ['property-pnl', startDate, endDate],
    queryFn: () => dashboardApi.getPropertyPnl(startDate, endDate),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  const properties = report?.properties ?? [];
  const totals = report?.totals ?? { revenue: 0, expenses: 0, netIncome: 0 };

  const columns: ColumnsType<PropertyPnlItem> = [
    {
      title: 'Property',
      dataIndex: 'propertyName',
      key: 'propertyName',
      ellipsis: true,
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right',
      sorter: (a: PropertyPnlItem, b: PropertyPnlItem) => a.revenue - b.revenue,
      render: (value: number) => (
        <Text style={{ color: '#3f8600' }}>{formatKES(value)}</Text>
      ),
    },
    {
      title: 'Expenses',
      dataIndex: 'expenses',
      key: 'expenses',
      align: 'right',
      sorter: (a: PropertyPnlItem, b: PropertyPnlItem) => a.expenses - b.expenses,
      render: (value: number) => (
        <Text style={{ color: '#cf1322' }}>{formatKES(value)}</Text>
      ),
    },
    {
      title: 'Net Income',
      dataIndex: 'netIncome',
      key: 'netIncome',
      align: 'right',
      sorter: (a: PropertyPnlItem, b: PropertyPnlItem) => a.netIncome - b.netIncome,
      render: (value: number) => (
        <Text strong style={{ color: value >= 0 ? '#3f8600' : '#cf1322' }}>
          {formatKES(value)}
        </Text>
      ),
    },
    {
      title: 'Occupancy',
      dataIndex: 'occupancyRate',
      key: 'occupancyRate',
      align: 'right',
      responsive: ['md'] as any,
      render: (value: number) => `${Math.round(value)}%`,
    },
    {
      title: 'Units',
      dataIndex: 'unitCount',
      key: 'unitCount',
      align: 'right',
      responsive: ['lg'] as any,
    },
  ];

  // Transform data for grouped bar chart
  const chartData: ChartDataItem[] = properties.flatMap((item: PropertyPnlItem) => [
    { property: item.propertyName, type: 'Revenue' as const, value: item.revenue },
    { property: item.propertyName, type: 'Expenses' as const, value: item.expenses },
  ]);

  const chartConfig = {
    data: chartData,
    xField: 'property',
    yField: 'value',
    colorField: 'type',
    group: true,
    scale: {
      color: {
        range: ['#52c41a', '#ff4d4f'],
      },
    },
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
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

  const handleDateRangeChange = (dates: RangeValue) => {
    setDateRange(dates);
  };

  return (
    <div>
      {/* Date range filter */}
      <div style={{
        marginBottom: isMobile ? 12 : 16,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: 8,
      }}>
        <Text style={{ fontSize: isMobile ? 12 : 14 }}>Date Range:</Text>
        <RangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          size={isMobile ? 'middle' : 'middle'}
          style={{ width: isMobile ? '100%' : undefined }}
          presets={[
            { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
            { label: '3 Months', value: [dayjs().subtract(3, 'month'), dayjs()] },
            { label: '6 Months', value: [dayjs().subtract(6, 'month'), dayjs()] },
            { label: 'Last Year', value: [dayjs().subtract(1, 'year'), dayjs()] },
          ]}
        />
      </div>

      {/* Chart */}
      {properties.length > 0 && (
        <Card
          title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Revenue vs Expenses</Text>}
          size={isMobile ? 'small' : 'default'}
          style={{ marginBottom: isMobile ? 8 : 16 }}
        >
          <Column {...chartConfig} height={isMobile ? 220 : 350} />
        </Card>
      )}

      {/* Table — mobile cards or desktop table */}
      {isMobile ? (
        <div>
          {properties.length === 0 ? (
            <Card size="small"><Text type="secondary">No property data available.</Text></Card>
          ) : (
            <>
              {properties.map((item) => (
                <Card
                  key={item.propertyId}
                  size="small"
                  style={{ marginBottom: 8 }}
                  styles={{ body: { padding: '10px 12px' } }}
                >
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                    {item.propertyName}
                  </Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <Text type="secondary">Revenue</Text>
                    <Text style={{ color: '#3f8600' }}>{formatKES(item.revenue)}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <Text type="secondary">Expenses</Text>
                    <Text style={{ color: '#cf1322' }}>{formatKES(item.expenses)}</Text>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    borderTop: '1px solid #f5f5f5',
                    paddingTop: 4,
                    marginTop: 4,
                  }}>
                    <Text strong>Net Income</Text>
                    <Text strong style={{ color: item.netIncome >= 0 ? '#3f8600' : '#cf1322' }}>
                      {formatKES(item.netIncome)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                    <Text type="secondary">Occupancy: {Math.round(item.occupancyRate)}%</Text>
                    <Text type="secondary">{item.unitCount} units</Text>
                  </div>
                </Card>
              ))}
              {/* Totals card */}
              <Card
                size="small"
                style={{ marginBottom: 8, background: '#fafafa', borderStyle: 'dashed' }}
                styles={{ body: { padding: '10px 12px' } }}
              >
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Totals
                </Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <Text type="secondary">Revenue</Text>
                  <Text strong style={{ color: '#3f8600' }}>{formatKES(totals.revenue)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <Text type="secondary">Expenses</Text>
                  <Text strong style={{ color: '#cf1322' }}>{formatKES(totals.expenses)}</Text>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  borderTop: '1px solid #e8e8e8',
                  paddingTop: 4,
                  marginTop: 4,
                }}>
                  <Text strong>Net Income</Text>
                  <Text strong style={{ color: totals.netIncome >= 0 ? '#3f8600' : '#cf1322' }}>
                    {formatKES(totals.netIncome)}
                  </Text>
                </div>
              </Card>
            </>
          )}
        </div>
      ) : (
        <Card
          title={<Text strong style={{ fontSize: 16 }}>Property P&L Details</Text>}
        >
          <Table<PropertyPnlItem>
            columns={columns}
            dataSource={properties}
            rowKey="propertyId"
            pagination={false}
            size="middle"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <Text strong>Totals</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong style={{ color: '#3f8600' }}>{formatKES(totals.revenue)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong style={{ color: '#cf1322' }}>{formatKES(totals.expenses)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong style={{ color: totals.netIncome >= 0 ? '#3f8600' : '#cf1322' }}>
                    {formatKES(totals.netIncome)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} />
                <Table.Summary.Cell index={5} />
              </Table.Summary.Row>
            )}
          />
        </Card>
      )}
    </div>
  );
}
