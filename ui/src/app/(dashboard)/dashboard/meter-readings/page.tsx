"use client";

import { useState, useMemo } from 'react';
import {
  Typography,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Card,
  App,
  Space,
  Grid,
} from 'antd';
import {
  PlusOutlined,
  DashboardOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { propertiesApi, unitsApi } from '@/lib/api/properties.api';
import { parseError } from '@/lib/api/parseError';
import { formatKES } from '@/lib/format-kes';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
import type { Property, Unit } from '@/types/properties';
import type { ColumnsType } from 'antd/es/table';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// ─── Types ──────────────────────────────────────────────

type MeterType = 'water' | 'electricity';

interface MeterReading {
  meterReadingId: string;
  unitId: string;
  meterType: MeterType;
  readingDate: string;
  billingMonth: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  rate: number;
  totalCharge: number;
  notes?: string;
  unit?: Unit & { property?: Property };
  createdAt?: string;
}

interface CreateMeterReadingInput {
  unitId: string;
  meterType: MeterType;
  previousReading: number;
  currentReading: number;
  rate: number;
  billingMonth: string;
  notes?: string;
}

// ─── API ────────────────────────────────────────────────

const meterReadingsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    unitId?: string;
    meterType?: string;
    billingMonth?: string;
    propertyId?: string;
  }) => {
    const response = await api.get('/meter-readings', { params });
    return response.data;
  },

  getByUnit: async (params: { unitId: string; billingMonth: string }) => {
    const response = await api.get('/meter-readings/by-unit', { params });
    return response.data;
  },

  getLatest: async (params: { unitId: string; meterType: string }) => {
    const response = await api.get('/meter-readings/latest', { params });
    return response.data;
  },

  create: async (input: CreateMeterReadingInput): Promise<MeterReading> => {
    const response = await api.post('/meter-readings', input);
    return response.data;
  },
};

// ─── Constants ──────────────────────────────────────────

const METER_TYPE_COLOR: Record<MeterType, string> = {
  water: 'blue',
  electricity: 'orange',
};

const METER_TYPE_LABEL: Record<MeterType, string> = {
  water: 'Water',
  electricity: 'Electricity',
};

// ─── Page Component ─────────────────────────────────────

export default function MeterReadingsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [propertyFilter, setPropertyFilter] = useState<string | undefined>(undefined);
  const [meterTypeFilter, setMeterTypeFilter] = useState<string | undefined>(undefined);
  const [billingMonthFilter, setBillingMonthFilter] = useState<dayjs.Dayjs | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form] = Form.useForm();

  // Form state for property -> unit cascade and auto-calc
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);

  // ─── Queries ────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['meter-readings', propertyFilter, meterTypeFilter, billingMonthFilter?.format('YYYY-MM'), page, pageSize],
    queryFn: () =>
      meterReadingsApi.getAll({
        page,
        limit: pageSize,
        propertyId: propertyFilter,
        meterType: meterTypeFilter,
        billingMonth: billingMonthFilter ? billingMonthFilter.startOf('month').format('YYYY-MM-DD') : undefined,
      }),
    enabled: isAuthenticated,
  });

  const readings: MeterReading[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'all'],
    queryFn: () => propertiesApi.getAll({ limit: 200 }),
    enabled: isAuthenticated,
  });

  const propertiesList: Property[] = Array.isArray(propertiesData?.data) ? propertiesData.data : [];

  // Units for the create modal (filtered by selected property)
  const { data: unitsData } = useQuery({
    queryKey: ['units', 'byProperty', selectedPropertyId],
    queryFn: () => unitsApi.getByProperty(selectedPropertyId!, { limit: 200 }),
    enabled: isModalOpen && !!selectedPropertyId,
  });

  const unitsList: Unit[] = Array.isArray(unitsData) ? unitsData : [];

  // ─── Create Mutation ────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (values: CreateMeterReadingInput) => meterReadingsApi.create(values),
    onSuccess: () => {
      message.success('Meter reading recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['meter-readings'] });
      setIsModalOpen(false);
      form.resetFields();
      setSelectedPropertyId(undefined);
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to record meter reading'));
    },
  });

  // ─── Auto-fetch latest reading ──────────────────────

  const handleFetchLatestReading = async () => {
    const unitId = form.getFieldValue('unitId');
    const meterType = form.getFieldValue('meterType');
    if (!unitId || !meterType) return;

    try {
      const latest = await meterReadingsApi.getLatest({ unitId, meterType });
      if (latest && latest.currentReading != null) {
        form.setFieldsValue({ previousReading: Number(latest.currentReading) });
      }
    } catch {
      // No previous reading found — leave blank
    }
  };

  // ─── Handlers ───────────────────────────────────────

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateMeterReadingInput = {
        unitId: values.unitId,
        meterType: values.meterType,
        previousReading: values.previousReading,
        currentReading: values.currentReading,
        rate: values.rate,
        billingMonth: values.billingMonth.startOf('month').format('YYYY-MM-DD'),
        notes: values.notes || undefined,
      };
      createMutation.mutate(payload);
    } catch {
      // validation errors shown inline by Ant Design
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    form.resetFields();
    setSelectedPropertyId(undefined);
  };

  // ─── Auto-calculated values in the form ─────────────

  const FormCalculation = () => {
    const prevReading = Form.useWatch('previousReading', form);
    const currReading = Form.useWatch('currentReading', form);
    const rate = Form.useWatch('rate', form);

    const consumption = useMemo(() => {
      if (currReading != null && prevReading != null && currReading >= prevReading) {
        return currReading - prevReading;
      }
      return null;
    }, [currReading, prevReading]);

    const charge = useMemo(() => {
      if (consumption != null && rate != null && rate > 0) {
        return consumption * rate;
      }
      return null;
    }, [consumption, rate]);

    if (consumption === null && charge === null) return null;

    return (
      <Card size="small" style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}>
        <Space size="large">
          {consumption !== null && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Consumption</Text>
              <div>
                <Text strong style={{ fontSize: 16 }}>{consumption.toLocaleString()} units</Text>
              </div>
            </div>
          )}
          {charge !== null && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Total Charge</Text>
              <div>
                <Text strong style={{ fontSize: 16, color: '#52c41a' }}>{formatKES(charge)}</Text>
              </div>
            </div>
          )}
        </Space>
      </Card>
    );
  };

  // ─── Table Columns ──────────────────────────────────

  const columns: ColumnsType<MeterReading> = [
    {
      title: 'Unit',
      key: 'unit',
      render: (_: unknown, record: MeterReading) =>
        record.unit?.unitNumber || '-',
      sorter: (a, b) =>
        (a.unit?.unitNumber || '').localeCompare(b.unit?.unitNumber || ''),
    },
    {
      title: 'Property',
      key: 'property',
      render: (_: unknown, record: MeterReading) =>
        record.unit?.property?.name || '-',
      sorter: (a, b) =>
        (a.unit?.property?.name || '').localeCompare(b.unit?.property?.name || ''),
    },
    {
      title: 'Type',
      dataIndex: 'meterType',
      key: 'meterType',
      render: (type: MeterType) => (
        <Tag color={METER_TYPE_COLOR[type] || 'default'}>
          {METER_TYPE_LABEL[type] || type}
        </Tag>
      ),
      filters: [
        { text: 'Water', value: 'water' },
        { text: 'Electricity', value: 'electricity' },
      ],
      onFilter: (value, record) => record.meterType === value,
    },
    {
      title: 'Billing Month',
      dataIndex: 'billingMonth',
      key: 'billingMonth',
      render: (value: string) =>
        value ? dayjs(value).format('MMM YYYY') : '-',
      sorter: (a, b) =>
        new Date(a.billingMonth).getTime() - new Date(b.billingMonth).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Previous',
      dataIndex: 'previousReading',
      key: 'previousReading',
      render: (value: number) =>
        value != null ? Number(value).toLocaleString() : '-',
      align: 'right',
    },
    {
      title: 'Current',
      dataIndex: 'currentReading',
      key: 'currentReading',
      render: (value: number) =>
        value != null ? Number(value).toLocaleString() : '-',
      align: 'right',
    },
    {
      title: 'Consumption',
      dataIndex: 'consumption',
      key: 'consumption',
      render: (value: number) =>
        value != null ? Number(value).toLocaleString() : '-',
      sorter: (a, b) => Number(a.consumption) - Number(b.consumption),
      align: 'right',
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      render: (value: number) =>
        value != null ? formatKES(Number(value)) : '-',
      align: 'right',
    },
    {
      title: 'Charge',
      dataIndex: 'totalCharge',
      key: 'totalCharge',
      render: (value: number) =>
        value != null ? formatKES(Number(value)) : '-',
      sorter: (a, b) => Number(a.totalCharge) - Number(b.totalCharge),
      align: 'right',
    },
    {
      title: 'Date',
      dataIndex: 'readingDate',
      key: 'readingDate',
      render: (value: string) =>
        value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) =>
        new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime(),
    },
  ];

  // ─── CSV Export ─────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await meterReadingsApi.getAll({
        limit: 10000,
        propertyId: propertyFilter,
        meterType: meterTypeFilter,
        billingMonth: billingMonthFilter ? billingMonthFilter.startOf('month').format('YYYY-MM-DD') : undefined,
      });
      const allData: MeterReading[] = Array.isArray(all?.data) ? all.data : [];
      const csvColumns: CsvColumn<MeterReading>[] = [
        { header: 'Unit', accessor: (r) => r.unit?.unitNumber || '' },
        { header: 'Property', accessor: (r) => r.unit?.property?.name || '' },
        { header: 'Type', accessor: (r) => METER_TYPE_LABEL[r.meterType] || r.meterType },
        { header: 'Billing Month', accessor: (r) => r.billingMonth ? dayjs(r.billingMonth).format('MMM YYYY') : '' },
        { header: 'Previous Reading', accessor: (r) => Number(r.previousReading) },
        { header: 'Current Reading', accessor: (r) => Number(r.currentReading) },
        { header: 'Consumption', accessor: (r) => Number(r.consumption) },
        { header: 'Rate', accessor: (r) => Number(r.rate) },
        { header: 'Total Charge', accessor: (r) => Number(r.totalCharge) },
        { header: 'Reading Date', accessor: (r) => r.readingDate ? dayjs(r.readingDate).format('DD MMM YYYY') : '' },
        { header: 'Notes', accessor: (r) => r.notes || '' },
      ];
      downloadCsv(allData, csvColumns, 'meter-readings.csv');
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────

  return (
    <div>
      {/* Header */}
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
          <DashboardOutlined style={{ marginRight: 8 }} />
          Meter Readings
        </Title>
        <Space>
          <Button
            icon={<ExportOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={isLoading || readings.length === 0}
            size={isMobile ? 'small' : 'middle'}
          >
            {!isMobile && 'Export CSV'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            size={isMobile ? 'small' : 'middle'}
          >
            {isMobile ? 'Record' : 'Record Reading'}
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: isMobile ? 8 : 16 }}>
        <Space style={{ width: '100%' }} direction={isMobile ? 'vertical' : 'horizontal'} wrap>
          <Select
            placeholder="Filter by property"
            allowClear
            value={propertyFilter}
            onChange={(value) => {
              setPropertyFilter(value);
              setPage(1);
            }}
            style={{ width: isMobile ? '100%' : 200 }}
            size={isMobile ? 'middle' : 'large'}
            options={propertiesList.map((p) => ({
              label: p.name,
              value: p.propertyId,
            }))}
          />
          <Select
            placeholder="Filter by type"
            allowClear
            value={meterTypeFilter}
            onChange={(value) => {
              setMeterTypeFilter(value);
              setPage(1);
            }}
            style={{ width: isMobile ? '100%' : 160 }}
            size={isMobile ? 'middle' : 'large'}
            options={[
              { label: 'Water', value: 'water' },
              { label: 'Electricity', value: 'electricity' },
            ]}
          />
          <DatePicker
            picker="month"
            placeholder="Filter by billing month"
            allowClear
            value={billingMonthFilter}
            onChange={(value) => {
              setBillingMonthFilter(value);
              setPage(1);
            }}
            style={{ width: isMobile ? '100%' : 200 }}
            size={isMobile ? 'middle' : 'large'}
          />
        </Space>
      </div>

      {/* Data Display */}
      {isMobile ? (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Text type="secondary">Loading...</Text>
            </div>
          ) : readings.length === 0 ? (
            <Card>
              <Text type="secondary">No meter readings found.</Text>
            </Card>
          ) : (
            <>
              {readings.map((reading) => (
                <Card
                  key={reading.meterReadingId}
                  size="small"
                  style={{ marginBottom: 8 }}
                  styles={{ body: { padding: '12px 14px' } }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13, display: 'block' }}>
                        {reading.unit?.unitNumber || '-'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {reading.unit?.property?.name || '-'}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 8 }}>
                      <Text strong style={{ fontSize: 14, display: 'block' }}>
                        {formatKES(Number(reading.totalCharge))}
                      </Text>
                      <Tag
                        color={METER_TYPE_COLOR[reading.meterType] || 'default'}
                        style={{ margin: 0, fontSize: 10 }}
                      >
                        {METER_TYPE_LABEL[reading.meterType] || reading.meterType}
                      </Tag>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid #f5f5f5',
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {Number(reading.previousReading).toLocaleString()} &rarr;{' '}
                      {Number(reading.currentReading).toLocaleString()} ={' '}
                      {Number(reading.consumption).toLocaleString()} units
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {reading.billingMonth
                        ? dayjs(reading.billingMonth).format('MMM YYYY')
                        : '-'}
                    </Text>
                  </div>
                </Card>
              ))}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {readings.length} of {pagination?.total || 0}
                </Text>
                {(pagination?.total || 0) > readings.length && (
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" onClick={() => setPageSize(pageSize + 10)}>
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <Card>
          <Table<MeterReading>
            columns={columns}
            dataSource={readings}
            loading={isLoading}
            rowKey="meterReadingId"
            pagination={{
              current: page,
              pageSize,
              total: pagination?.total || 0,
              showSizeChanger: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} readings`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
          />
        </Card>
      )}

      {/* Create Meter Reading Modal */}
      <Modal
        title="Record Meter Reading"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={handleModalClose}
        confirmLoading={createMutation.isPending}
        okText="Record Reading"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="propertyId"
            label="Property"
            rules={[{ required: true, message: 'Please select a property' }]}
          >
            <Select
              placeholder="Select a property"
              showSearch
              optionFilterProp="label"
              options={propertiesList.map((p) => ({
                label: `${p.name} - ${p.location}`,
                value: p.propertyId,
              }))}
              onChange={(value: string) => {
                setSelectedPropertyId(value);
                form.setFieldsValue({ unitId: undefined, previousReading: undefined });
              }}
            />
          </Form.Item>

          <Form.Item
            name="unitId"
            label="Unit"
            rules={[{ required: true, message: 'Please select a unit' }]}
          >
            <Select
              placeholder={
                selectedPropertyId
                  ? 'Select a unit'
                  : 'Select a property first'
              }
              showSearch
              optionFilterProp="label"
              disabled={!selectedPropertyId}
              options={unitsList.map((u) => ({
                label: u.unitNumber,
                value: u.unitId,
              }))}
              onChange={() => {
                handleFetchLatestReading();
              }}
            />
          </Form.Item>

          <Form.Item
            name="meterType"
            label="Meter Type"
            rules={[{ required: true, message: 'Please select a meter type' }]}
          >
            <Select
              placeholder="Select meter type"
              options={[
                { label: 'Water', value: 'water' },
                { label: 'Electricity', value: 'electricity' },
              ]}
              onChange={() => {
                handleFetchLatestReading();
              }}
            />
          </Form.Item>

          <Form.Item
            name="billingMonth"
            label="Billing Month"
            rules={[{ required: true, message: 'Please select the billing month' }]}
          >
            <DatePicker
              picker="month"
              style={{ width: '100%' }}
              placeholder="Select billing month"
            />
          </Form.Item>

          <Form.Item
            name="previousReading"
            label="Previous Reading"
            rules={[{ required: true, message: 'Please enter the previous reading' }]}
          >
            <InputNumber<number>
              min={0}
              style={{ width: '100%' }}
              placeholder="e.g. 1200"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={(value) => Number(value!.replace(/,/g, ''))}
            />
          </Form.Item>

          <Form.Item
            name="currentReading"
            label="Current Reading"
            rules={[
              { required: true, message: 'Please enter the current reading' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const prev = getFieldValue('previousReading');
                  if (value != null && prev != null && value < prev) {
                    return Promise.reject(
                      new Error('Current reading must be >= previous reading')
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber<number>
              min={0}
              style={{ width: '100%' }}
              placeholder="e.g. 1350"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={(value) => Number(value!.replace(/,/g, ''))}
            />
          </Form.Item>

          <Form.Item
            name="rate"
            label="Rate per Unit (KES)"
            rules={[{ required: true, message: 'Please enter the rate' }]}
          >
            <InputNumber<number>
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="e.g. 80"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={(value) => Number(value!.replace(/,/g, ''))}
            />
          </Form.Item>

          {/* Auto-calculated consumption and charge */}
          <FormCalculation />

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Additional notes (optional)..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
