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
  Select,
  Card,
  App,
  Empty,
  Space,
} from 'antd';
import {
  PlusOutlined,
  ToolOutlined,
  CloseCircleOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { maintenanceApi } from '@/lib/api/expenses.api';
import { parseError } from '@/lib/api/parseError';
import type {
  MaintenanceRequest,
  CreateMaintenanceRequestInput,
  ExpenseCategory,
  ExpenseStatus,
  ExpensePriority,
} from '@/types/expenses';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
import dayjs from 'dayjs';

const { Title } = Typography;

const STATUS_COLOR_MAP: Record<string, string> = {
  pending: 'orange',
  approved: 'blue',
  in_progress: 'cyan',
  completed: 'green',
  cancelled: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PRIORITY_COLOR_MAP: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  plumbing: 'Plumbing',
  roofing: 'Roofing',
  electrical: 'Electrical',
  painting: 'Painting',
  security: 'Security',
  general_maintenance: 'General Maintenance',
  structural: 'Structural',
  other: 'Other',
};

export default function TenantMaintenancePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form] = Form.useForm();

  const { isAuthenticated, user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['my-maintenance', page, pageSize],
    queryFn: () => maintenanceApi.getMy({ page, limit: pageSize }),
    enabled: isAuthenticated,
  });

  const requests: MaintenanceRequest[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const createMutation = useMutation({
    mutationFn: (values: CreateMaintenanceRequestInput) => maintenanceApi.create(values),
    onSuccess: () => {
      message.success('Maintenance request submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['my-maintenance'] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to submit maintenance request'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      maintenanceApi.update(id, { status: 'cancelled' as ExpenseStatus }),
    onSuccess: () => {
      message.success('Request cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['my-maintenance'] });
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to cancel request'));
    },
  });

  const handleCancel = (id: string) => {
    Modal.confirm({
      title: 'Cancel Maintenance Request',
      content: 'Are you sure you want to cancel this request? This action cannot be undone.',
      okText: 'Yes, Cancel',
      okType: 'danger',
      cancelText: 'No',
      onOk: () => cancelMutation.mutate(id),
    });
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateMaintenanceRequestInput = {
        tenantId: user?.tenant?.tenantId || '',
        description: values.description,
        category: values.category,
        priority: values.priority || undefined,
      };
      createMutation.mutate(payload);
    } catch {
      // validation errors shown inline
    }
  };

  const columns: ColumnsType<MaintenanceRequest> = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: ExpenseCategory) => (
        <Tag>{CATEGORY_LABEL_MAP[category] || category}</Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: ExpensePriority) => (
        <Tag color={PRIORITY_COLOR_MAP[priority] || 'default'}>
          {priority?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: ExpenseStatus) => (
        <Tag color={STATUS_COLOR_MAP[status] || 'default'}>
          {STATUS_LABEL_MAP[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Resolved',
      dataIndex: 'resolvedAt',
      key: 'resolvedAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: MaintenanceRequest) =>
        record.status === 'pending' ? (
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => handleCancel(record.maintenanceRequestId)}
            loading={cancelMutation.isPending}
          >
            Cancel
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <ToolOutlined style={{ marginRight: 8 }} />
          Maintenance Requests
        </Title>
        <Space>
          <Button
            icon={<ExportOutlined />}
            onClick={() => {
              const csvColumns: CsvColumn<MaintenanceRequest>[] = [
                { header: 'Description', accessor: (r) => r.description },
                { header: 'Category', accessor: (r) => CATEGORY_LABEL_MAP[r.category] || r.category },
                { header: 'Priority', accessor: (r) => r.priority?.toUpperCase() || '' },
                { header: 'Status', accessor: (r) => STATUS_LABEL_MAP[r.status] || r.status },
                { header: 'Submitted', accessor: (r) => r.createdAt ? dayjs(r.createdAt).format('DD MMM YYYY') : '' },
                { header: 'Resolved', accessor: (r) => r.resolvedAt ? dayjs(r.resolvedAt).format('DD MMM YYYY') : '' },
              ];
              downloadCsv(requests, csvColumns, 'my-maintenance.csv');
            }}
            disabled={isLoading || requests.length === 0}
          >
            Export CSV
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            New Request
          </Button>
        </Space>
      </div>

      <Card>
        <Table<MaintenanceRequest>
          columns={columns}
          dataSource={requests}
          loading={isLoading}
          rowKey="maintenanceRequestId"
          locale={{ emptyText: <Empty description="No maintenance requests yet" /> }}
          pagination={{
            current: page,
            pageSize,
            total: pagination?.total || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} requests`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      <Modal
        title="Submit Maintenance Request"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending}
        okText="Submit Request"
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select
              placeholder="What type of issue?"
              options={Object.entries(CATEGORY_LABEL_MAP).map(([value, label]) => ({
                label,
                value,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Priority"
          >
            <Select
              placeholder="How urgent is this?"
              allowClear
              options={[
                { label: 'Low - Can wait', value: 'low' },
                { label: 'Medium - Needs attention', value: 'medium' },
                { label: 'High - Important', value: 'high' },
                { label: 'Urgent - Emergency', value: 'urgent' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please describe the issue' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Please describe the maintenance issue in detail..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
