'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Select,
  Statistic,
  Row,
  Col,
  Typography,
  Tag,
  Grid,
  Spin,
  Button,
  Space,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { formatKES } from '@/lib/format-kes';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;
const { useBreakpoint } = Grid;

// --- Types ---

interface RevenueByMonth {
  month: string;
  amount: number;
}

interface ExpenseByCategory {
  category: string;
  amount: number;
}

interface TaxSummary {
  year: number;
  quarter?: number;
  totalRevenue: number;
  totalExpenses: number;
  netTaxableIncome: number;
  revenueByMonth: RevenueByMonth[];
  expensesByCategory: ExpenseByCategory[];
}

interface ExpenseBreakdownCategory {
  category: string;
  amount: number;
  count: number;
}

interface ExpenseBreakdown {
  categories: ExpenseBreakdownCategory[];
  total: number;
}

// --- API helpers ---

async function fetchTaxSummary(
  year: number,
  quarter?: number,
): Promise<TaxSummary> {
  const params: Record<string, number> = { year };
  if (quarter) {
    params.quarter = quarter;
  }
  const response = await api.get('/reports/tax-summary', { params });
  return response.data;
}

async function fetchExpenseBreakdown(
  startDate: string,
  endDate: string,
): Promise<ExpenseBreakdown> {
  const response = await api.get('/reports/expense-breakdown', {
    params: { startDate, endDate },
  });
  return response.data;
}

// --- Helpers ---

const currentYear = dayjs().year();

const yearOptions = Array.from(
  { length: currentYear - 2024 + 1 },
  (_, i) => {
    const year = 2024 + i;
    return { label: String(year), value: year };
  },
);

const quarterOptions = [
  { label: 'Full Year', value: 0 },
  { label: 'Q1 (Jan-Mar)', value: 1 },
  { label: 'Q2 (Apr-Jun)', value: 2 },
  { label: 'Q3 (Jul-Sep)', value: 3 },
  { label: 'Q4 (Oct-Dec)', value: 4 },
];

function formatCategoryLabel(category: string): string {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getQuarterDateRange(
  year: number,
  quarter: number,
): { startDate: string; endDate: string } {
  if (quarter === 0) {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const endDay = dayjs(`${year}-${String(endMonth).padStart(2, '0')}-01`)
    .endOf('month')
    .date();
  return {
    startDate: `${year}-${String(startMonth).padStart(2, '0')}-01`,
    endDate: `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
  };
}

// --- Component ---

export default function TaxReport() {
  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(0);

  const { startDate, endDate } = useMemo(
    () => getQuarterDateRange(selectedYear, selectedQuarter),
    [selectedYear, selectedQuarter],
  );

  const {
    data: taxSummary,
    isLoading: isTaxLoading,
  } = useQuery({
    queryKey: ['tax-summary', selectedYear, selectedQuarter],
    queryFn: () =>
      fetchTaxSummary(
        selectedYear,
        selectedQuarter > 0 ? selectedQuarter : undefined,
      ),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: expenseBreakdown,
    isLoading: isExpenseLoading,
  } = useQuery({
    queryKey: ['expense-breakdown', startDate, endDate],
    queryFn: () => fetchExpenseBreakdown(startDate, endDate),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isTaxLoading || isExpenseLoading;

  const totalRevenue = taxSummary?.totalRevenue ?? 0;
  const totalExpenses = taxSummary?.totalExpenses ?? 0;
  const netTaxableIncome = taxSummary?.netTaxableIncome ?? 0;
  const revenueByMonth = taxSummary?.revenueByMonth ?? [];
  const expenseCategories = expenseBreakdown?.categories ?? [];
  const expenseTotal = expenseBreakdown?.total ?? 0;

  // --- Table columns ---

  const revenueColumns: ColumnsType<RevenueByMonth> = [
    {
      title: 'Month',
      dataIndex: 'month',
      key: 'month',
      render: (value: string) => {
        const parsed = dayjs(value, ['YYYY-MM', 'MMMM', 'MMM']);
        return parsed.isValid() ? parsed.format('MMM YYYY') : value;
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      sorter: (a: RevenueByMonth, b: RevenueByMonth) => a.amount - b.amount,
      render: (value: number) => (
        <Text style={{ color: '#3f8600' }}>{formatKES(value)}</Text>
      ),
    },
  ];

  const expenseColumns: ColumnsType<ExpenseBreakdownCategory> = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (value: string) => (
        <Tag>{formatCategoryLabel(value)}</Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      sorter: (a: ExpenseBreakdownCategory, b: ExpenseBreakdownCategory) =>
        a.amount - b.amount,
      render: (value: number) => (
        <Text style={{ color: '#cf1322' }}>{formatKES(value)}</Text>
      ),
    },
    {
      title: '%',
      key: 'percentage',
      align: 'right',
      width: 70,
      render: (_: unknown, record: ExpenseBreakdownCategory) => {
        const pct =
          expenseTotal > 0
            ? ((record.amount / expenseTotal) * 100).toFixed(1)
            : '0.0';
        return `${pct}%`;
      },
    },
  ];

  // --- CSV export ---

  const handleExportCsv = () => {
    interface TaxCsvRow {
      section: string;
      label: string;
      amount: number;
      percentage: string;
    }

    const rows: TaxCsvRow[] = [];

    rows.push({ section: 'Summary', label: 'Total Revenue', amount: totalRevenue, percentage: '' });
    rows.push({ section: 'Summary', label: 'Total Expenses', amount: totalExpenses, percentage: '' });
    rows.push({ section: 'Summary', label: 'Net Taxable Income', amount: netTaxableIncome, percentage: '' });

    for (const item of revenueByMonth) {
      const parsed = dayjs(item.month, ['YYYY-MM', 'MMMM', 'MMM']);
      const label = parsed.isValid() ? parsed.format('MMMM YYYY') : item.month;
      rows.push({ section: 'Revenue by Month', label, amount: item.amount, percentage: '' });
    }

    for (const item of expenseCategories) {
      const pct = expenseTotal > 0
        ? ((item.amount / expenseTotal) * 100).toFixed(1) + '%'
        : '0.0%';
      rows.push({ section: 'Expenses by Category', label: formatCategoryLabel(item.category), amount: item.amount, percentage: pct });
    }

    const csvColumns: CsvColumn<TaxCsvRow>[] = [
      { header: 'Section', accessor: (row) => row.section },
      { header: 'Label', accessor: (row) => row.label },
      { header: 'Amount (KES)', accessor: (row) => row.amount },
      { header: '% of Total', accessor: (row) => row.percentage },
    ];

    const quarterLabel = selectedQuarter > 0 ? `Q${selectedQuarter}` : 'Full-Year';
    downloadCsv(rows, csvColumns, `tax-report-${selectedYear}-${quarterLabel}.csv`);
  };

  // --- Render ---

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" tip="Loading tax report..." />
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 8 : 12,
        marginBottom: isMobile ? 12 : 16,
      }}>
        <Space wrap size={isMobile ? 8 : 12} style={{ width: isMobile ? '100%' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: isMobile ? 12 : 14, whiteSpace: 'nowrap' }}>Year:</Text>
            <Select
              value={selectedYear}
              onChange={(value: number) => setSelectedYear(value)}
              options={yearOptions}
              style={{ width: isMobile ? 90 : 120 }}
              size={isMobile ? 'middle' : 'middle'}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: isMobile ? 12 : 14, whiteSpace: 'nowrap' }}>Quarter:</Text>
            <Select
              value={selectedQuarter}
              onChange={(value: number) => setSelectedQuarter(value)}
              options={quarterOptions}
              style={{ width: isMobile ? 140 : 180 }}
              size={isMobile ? 'middle' : 'middle'}
            />
          </div>
        </Space>
        <div style={{ marginLeft: isMobile ? 0 : 'auto' }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportCsv}
            size={isMobile ? 'middle' : 'middle'}
            disabled={!taxSummary && !expenseBreakdown}
            block={isMobile}
          >
            {isMobile ? 'Export CSV' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Summary statistics */}
      <Row gutter={isMobile ? [8, 8] : [16, 16]} style={{ marginBottom: isMobile ? 12 : 24 }}>
        <Col xs={24} md={8}>
          <Card size={isMobile ? 'small' : 'default'}>
            <Statistic
              title="Total Revenue"
              value={totalRevenue}
              formatter={(value) => (
                <span style={{ color: '#3f8600' }}>
                  {formatKES(value as number)}
                </span>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size={isMobile ? 'small' : 'default'}>
            <Statistic
              title="Total Expenses"
              value={totalExpenses}
              formatter={(value) => (
                <span style={{ color: '#cf1322' }}>
                  {formatKES(value as number)}
                </span>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size={isMobile ? 'small' : 'default'}>
            <Statistic
              title="Net Taxable Income"
              value={netTaxableIncome}
              formatter={(value) => (
                <span
                  style={{
                    color: (value as number) >= 0 ? '#1677ff' : '#cf1322',
                  }}
                >
                  {formatKES(value as number)}
                </span>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Revenue by month */}
      <Card
        title={
          <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
            Revenue by Month
          </Text>
        }
        size={isMobile ? 'small' : 'default'}
        style={{ marginBottom: isMobile ? 8 : 16 }}
      >
        {isMobile ? (
          <div>
            {revenueByMonth.map((item) => {
              const parsed = dayjs(item.month, ['YYYY-MM', 'MMMM', 'MMM']);
              const label = parsed.isValid() ? parsed.format('MMM YYYY') : item.month;
              return (
                <div
                  key={item.month}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid #f5f5f5',
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{label}</Text>
                  <Text style={{ color: '#3f8600', fontSize: 13 }}>{formatKES(item.amount)}</Text>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <Text strong style={{ fontSize: 13 }}>Total</Text>
              <Text strong style={{ color: '#3f8600', fontSize: 13 }}>{formatKES(totalRevenue)}</Text>
            </div>
          </div>
        ) : (
          <Table<RevenueByMonth>
            columns={revenueColumns}
            dataSource={revenueByMonth}
            rowKey="month"
            pagination={false}
            size="middle"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong style={{ color: '#3f8600' }}>
                    {formatKES(totalRevenue)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        )}
      </Card>

      {/* Expenses by category */}
      <Card
        title={
          <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
            Expenses by Category
          </Text>
        }
        size={isMobile ? 'small' : 'default'}
      >
        {isMobile ? (
          <div>
            {expenseCategories.map((item) => {
              const pct = expenseTotal > 0 ? ((item.amount / expenseTotal) * 100).toFixed(1) : '0.0';
              return (
                <div
                  key={item.category}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #f5f5f5',
                  }}
                >
                  <div>
                    <Tag style={{ fontSize: 11 }}>{formatCategoryLabel(item.category)}</Tag>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text style={{ color: '#cf1322', fontSize: 13 }}>{formatKES(item.amount)}</Text>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>({pct}%)</Text>
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <Text strong style={{ fontSize: 13 }}>Total</Text>
              <Text strong style={{ color: '#cf1322', fontSize: 13 }}>{formatKES(expenseTotal)}</Text>
            </div>
          </div>
        ) : (
          <Table<ExpenseBreakdownCategory>
            columns={expenseColumns}
            dataSource={expenseCategories}
            rowKey="category"
            pagination={false}
            size="middle"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong style={{ color: '#cf1322' }}>
                    {formatKES(expenseTotal)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong>100%</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        )}
      </Card>
    </div>
  );
}
