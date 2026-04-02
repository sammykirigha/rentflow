"use client";

import { useState } from 'react';
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
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  RiseOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { propertiesApi } from '@/lib/api/properties.api';
import { parseError } from '@/lib/api/parseError';
import type { Property } from '@/types/properties';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

type EscalationStatus = 'pending' | 'notified' | 'applied' | 'cancelled';

interface RentEscalation {
  rentEscalationId: string;
  propertyId: string;
  percentage: number;
  effectiveDate: string;
  status: EscalationStatus;
  notifiedAt: string | null;
  appliedAt: string | null;
  notes: string | null;
  property: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateEscalationInput {
  propertyId: string;
  percentage: number;
  effectiveDate: string;
  notes?: string;
}

const STATUS_COLOR_MAP: Record<EscalationStatus, string> = {
  pending: 'orange',
  notified: 'blue',
  applied: 'green',
  cancelled: 'default',
};

const STATUS_LABEL_MAP: Record<EscalationStatus, string> = {
  pending: 'Pending',
  notified: 'Notified',
  applied: 'Applied',
  cancelled: 'Cancelled',
};

const rentEscalationsApi = {
  getAll: async (params?: { page?: number; limit?: number; propertyId?: string }) => {
    const response = await api.get('/rent-escalations', { params });
    return response.data;
  },
  create: async (data: CreateEscalationInput) => {
    const response = await api.post('/rent-escalations', data);
    return response.data;
  },
  cancel: async (id: string) => {
    const response = await api.delete(`/rent-escalations/${id}`);
    return response.data;
  },
};

export default function RentEscalationsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [propertyFilter, setPropertyFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form] = Form.useForm();

  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data, isLoading } = useQuery({
    queryKey: ['rent-escalations', propertyFilter, page, pageSize],
    queryFn: () => rentEscalationsApi.getAll({
      propertyId: propertyFilter,
      page,
      limit: pageSize,
    }),
    enabled: isAuthenticated,
  });

  const escalations: RentEscalation[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'all'],
    queryFn: () => propertiesApi.getAll({ limit: 200 }),
  });

  const propertiesList: Property[] = Array.isArray(propertiesData?.data) ? propertiesData.data : [];

  const createMutation = useMutation({
    mutationFn: (values: CreateEscalationInput) => rentEscalationsApi.create(values),
    onSuccess: () => {
      message.success('Rent escalation scheduled successfully');
      queryClient.invalidateQueries({ queryKey: ['rent-escalations'] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to schedule rent escalation'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => rentEscalationsApi.cancel(id),
    onSuccess: () => {
      message.success('Rent escalation cancelled');
      queryClient.invalidateQueries({ queryKey: ['rent-escalations'] });
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to cancel rent escalation'));
    },
  });

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateEscalationInput = {
        propertyId: values.propertyId,
        percentage: values.percentage,
        effectiveDate: values.effectiveDate.toISOString(),
        notes: values.notes || undefined,
      };
      createMutation.mutate(payload);
    } catch {
      // validation errors are shown inline by Ant Design
    }
  };

  const canCancel = (status: EscalationStatus): boolean => {
    return status === 'pending' || status === 'notified';
  };

  const columns: ColumnsType<RentEscalation> = [
    {
      title: 'Property',
      key: 'property',
      render: (_: unknown, record: RentEscalation) => record.property?.name || '-',
      sorter: (a, b) => (a.property?.name || '').localeCompare(b.property?.name || ''),
    },
    {
      title: 'Percentage (%)',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (value: number) => `${value}%`,
      sorter: (a, b) => a.percentage - b.percentage,
      align: 'right',
    },
    {
      title: 'Effective Date',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: EscalationStatus) => (
        <Tag color={STATUS_COLOR_MAP[status] || 'default'}>
          {STATUS_LABEL_MAP[status] || status}
        </Tag>
      ),
      filters: Object.entries(STATUS_LABEL_MAP).map(([value, text]) => ({ text, value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Notified At',
      dataIndex: 'notifiedAt',
      key: 'notifiedAt',
      render: (value: string | null) => value ? dayjs(value).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Applied At',
      dataIndex: 'appliedAt',
      key: 'appliedAt',
      render: (value: string | null) => value ? dayjs(value).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: RentEscalation) => (
        canCancel(record.status) ? (
          <Popconfirm
            title="Cancel escalation"
            description="Are you sure you want to cancel this rent escalation?"
            onConfirm={() => cancelMutation.mutate(record.rentEscalationId)}
            okText="Yes, Cancel"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              loading={cancelMutation.isPending}
            >
              Cancel
            </Button>
          </Popconfirm>
        ) : null
      ),
    },
  ];

  const renderMobileCard = (escalation: RentEscalation) => (
    <Card
      key={escalation.rentEscalationId}
      size="small"
      style={{ marginBottom: 8 }}
      styles={{ body: { padding: '12px 14px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
            {escalation.property?.name || '-'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Effective: {escalation.effectiveDate ? dayjs(escalation.effectiveDate).format('DD MMM YYYY') : '-'}
          </Text>
        </div>
        <div style={{ textAlign: 'right', marginLeft: 8 }}>
          <Text strong style={{ fontSize: 14, display: 'block' }}>{escalation.percentage}%</Text>
          <Tag color={STATUS_COLOR_MAP[escalation.status] || 'default'} style={{ margin: 0, fontSize: 10 }}>
            {STATUS_LABEL_MAP[escalation.status] || escalation.status}
          </Tag>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {escalation.notifiedAt && `Notified: ${dayjs(escalation.notifiedAt).format('DD MMM YYYY')}`}
          {escalation.appliedAt && `Applied: ${dayjs(escalation.appliedAt).format('DD MMM YYYY')}`}
          {!escalation.notifiedAt && !escalation.appliedAt && 'Awaiting action'}
        </Text>
        {canCancel(escalation.status) && (
          <Popconfirm
            title="Cancel escalation"
            description="Are you sure you want to cancel this rent escalation?"
            onConfirm={() => cancelMutation.mutate(escalation.rentEscalationId)}
            okText="Yes, Cancel"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              size="small"
              loading={cancelMutation.isPending}
            >
              Cancel
            </Button>
          </Popconfirm>
        )}
      </div>
    </Card>
  );

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 8 : 0,
        marginBottom: isMobile ? 12 : 24,
      }}>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          <RiseOutlined style={{ marginRight: 8 }} />
          Rent Escalations
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
          size={isMobile ? 'small' : 'middle'}
        >
          {isMobile ? 'Schedule' : 'Schedule Escalation'}
        </Button>
      </div>

      <div style={{ marginBottom: isMobile ? 8 : 16 }}>
        <Space style={{ width: '100%' }} direction={isMobile ? 'vertical' : 'horizontal'} wrap>
          <Select
            placeholder="Filter by property"
            allowClear
            value={propertyFilter}
            onChange={(value) => { setPropertyFilter(value); setPage(1); }}
            style={{ width: isMobile ? '100%' : 200 }}
            size={isMobile ? 'middle' : 'large'}
            options={propertiesList.map((p) => ({
              label: p.name,
              value: p.propertyId,
            }))}
          />
        </Space>
      </div>

      {isMobile ? (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">Loading...</Text></div>
          ) : escalations.length === 0 ? (
            <Card><Text type="secondary">No rent escalations found.</Text></Card>
          ) : (
            <>
              {escalations.map(renderMobileCard)}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {escalations.length} of {pagination?.total || 0}
                </Text>
                {(pagination?.total || 0) > escalations.length && (
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" onClick={() => setPageSize(pageSize + 10)}>Load More</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <Card>
          <Table<RentEscalation>
            columns={columns}
            dataSource={escalations}
            loading={isLoading}
            rowKey="rentEscalationId"
            pagination={{
              current: page,
              pageSize,
              total: pagination?.total || 0,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} escalations`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
          />
        </Card>
      )}

      {/* Schedule Escalation Modal */}
      <Modal
        title="Schedule Rent Escalation"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending}
        okText="Schedule Escalation"
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
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
            />
          </Form.Item>

          <Form.Item
            name="percentage"
            label="Percentage (%)"
            rules={[{ required: true, message: 'Please enter the escalation percentage' }]}
          >
            <InputNumber<number>
              min={0.1}
              max={50}
              step={0.5}
              style={{ width: '100%' }}
              placeholder="e.g. 5"
              addonAfter="%"
            />
          </Form.Item>

          <Form.Item
            name="effectiveDate"
            label="Effective Date"
            rules={[{ required: true, message: 'Please select the effective date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={3} placeholder="Optional notes about this escalation..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
