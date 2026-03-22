"use client";

import { useState } from 'react';
import {
  Typography,
  Table,
  Tag,
  Modal,
  Select,
  Card,
  App,
  Space,
  Descriptions,
  Button,
  InputNumber,
  Input,
  Form,
  Grid,
} from 'antd';
import { AlertOutlined, PlusOutlined, ExportOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { maintenanceApi } from '@/lib/api/expenses.api';
import { propertiesApi } from '@/lib/api/properties.api';
import { tenantsApi } from '@/lib/api/tenants.api';
import { parseError } from '@/lib/api/parseError';
import type {
  MaintenanceRequest,
  ExpenseCategory,
  ExpensePriority,
  ExpenseStatus,
  CreateMaintenanceRequestInput,
} from '@/types/expenses';
import type { Property } from '@/types/properties';
import type { Tenant } from '@/types/tenants';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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

function getPropertyName(record: MaintenanceRequest): string {
  return record.property?.name || record.tenant?.unit?.property?.name || '-';
}

function getTenantName(record: MaintenanceRequest): string {
  if (!record.tenant?.user) return record.tenantId ? '-' : 'General';
  const name = `${record.tenant.user.firstName || ''} ${record.tenant.user.lastName || ''}`.trim();
  return name || '-';
}

export default function MaintenancePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completionForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const selectedPropertyId = Form.useWatch('propertyId', createForm);

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', statusFilter, categoryFilter, page, pageSize],
    queryFn: () => maintenanceApi.getAll({
      status: statusFilter,
      category: categoryFilter,
      page,
      limit: pageSize,
    }),
    enabled: isAuthenticated,
  });

  const requests: MaintenanceRequest[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'all'],
    queryFn: () => propertiesApi.getAll({ limit: 200 }),
    enabled: isAuthenticated,
  });

  const propertiesList: Property[] = Array.isArray(propertiesData?.data) ? propertiesData.data : [];

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants', selectedPropertyId],
    queryFn: () => tenantsApi.getAll({ propertyId: selectedPropertyId, limit: 200 }),
    enabled: createModalOpen && isAuthenticated && !!selectedPropertyId,
  });

  const tenantsList: Tenant[] = Array.isArray(tenantsData?.data) ? tenantsData.data : [];

  const updateMutation = useMutation({
    mutationFn: ({ id, status, expenseAmount }: { id: string; status: string; expenseAmount?: number }) =>
      maintenanceApi.update(id, {
        status: status as ExpenseStatus,
        resolvedAt: status === 'completed' ? new Date().toISOString() : undefined,
        expenseAmount,
      }),
    onSuccess: () => {
      message.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDetailModalOpen(false);
      setCompletionModalOpen(false);
      setSelectedRequest(null);
      completionForm.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to update status'));
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateMaintenanceRequestInput) => maintenanceApi.create(input),
    onSuccess: () => {
      message.success('Maintenance request created successfully');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setCreateModalOpen(false);
      createForm.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to create maintenance request'));
    },
  });

  const handleRowClick = (record: MaintenanceRequest) => {
    setSelectedRequest(record);
    setDetailModalOpen(true);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!selectedRequest) return;
    if (newStatus === 'completed') {
      setCompletionModalOpen(true);
      return;
    }
    updateMutation.mutate({ id: selectedRequest.maintenanceRequestId, status: newStatus });
  };

  const handleCompleteWithExpense = async () => {
    if (!selectedRequest) return;
    try {
      const values = await completionForm.validateFields();
      updateMutation.mutate({
        id: selectedRequest.maintenanceRequestId,
        status: 'completed',
        expenseAmount: values.expenseAmount || undefined,
      });
    } catch {
      // validation errors shown inline
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const payload: CreateMaintenanceRequestInput = {
        propertyId: values.propertyId,
        tenantId: values.tenantId || undefined,
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
      title: 'Property',
      key: 'property',
      render: (_: unknown, record: MaintenanceRequest) => getPropertyName(record),
    },
    {
      title: 'Unit',
      key: 'unit',
      render: (_: unknown, record: MaintenanceRequest) => record.tenant?.unit?.unitNumber || '-',
    },
    {
      title: 'Tenant',
      key: 'tenant',
      render: (_: unknown, record: MaintenanceRequest) => getTenantName(record),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 250,
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
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
  ];

  const renderMobileCard = (record: MaintenanceRequest) => (
    <Card
      key={record.maintenanceRequestId}
      size="small"
      style={{ marginBottom: 8, cursor: 'pointer' }}
      styles={{ body: { padding: '12px 14px' } }}
      hoverable
      onClick={() => handleRowClick(record)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
            {record.description}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getPropertyName(record)}{record.tenant?.unit?.unitNumber ? ` · ${record.tenant.unit.unitNumber}` : ''}
          </Text>
        </div>
        <div style={{ textAlign: 'right', marginLeft: 8, flexShrink: 0 }}>
          <Tag color={STATUS_COLOR_MAP[record.status] || 'default'} style={{ margin: 0, fontSize: 10 }}>
            {STATUS_LABEL_MAP[record.status] || record.status}
          </Tag>
          <div style={{ marginTop: 4 }}>
            <Tag color={PRIORITY_COLOR_MAP[record.priority] || 'default'} style={{ margin: 0, fontSize: 10 }}>
              {record.priority?.toUpperCase()}
            </Tag>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {CATEGORY_LABEL_MAP[record.category] || record.category}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {getTenantName(record) !== '-' ? getTenantName(record) : ''}
          {record.createdAt ? ` · ${dayjs(record.createdAt).format('DD MMM YYYY')}` : ''}
        </Text>
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
          <AlertOutlined style={{ marginRight: 8 }} />
          Maintenance Requests
        </Title>
        <Space>
          <Button
            icon={<ExportOutlined />}
            onClick={async () => {
              setExporting(true);
              try {
                const all = await maintenanceApi.getAll({ limit: 10000, status: statusFilter, category: categoryFilter });
                const allData: MaintenanceRequest[] = Array.isArray(all?.data) ? all.data : [];
                const csvColumns: CsvColumn<MaintenanceRequest>[] = [
                  { header: 'Property', accessor: (r) => getPropertyName(r) },
                  { header: 'Unit', accessor: (r) => r.tenant?.unit?.unitNumber || '' },
                  { header: 'Tenant', accessor: (r) => getTenantName(r) },
                  { header: 'Description', accessor: (r) => r.description },
                  { header: 'Category', accessor: (r) => CATEGORY_LABEL_MAP[r.category] || r.category },
                  { header: 'Priority', accessor: (r) => r.priority?.toUpperCase() || '' },
                  { header: 'Status', accessor: (r) => STATUS_LABEL_MAP[r.status] || r.status },
                  { header: 'Date', accessor: (r) => r.createdAt ? dayjs(r.createdAt).format('DD MMM YYYY') : '' },
                ];
                downloadCsv(allData, csvColumns, 'maintenance.csv');
              } finally {
                setExporting(false);
              }
            }}
            loading={exporting}
            disabled={isLoading || requests.length === 0}
            size={isMobile ? 'small' : 'middle'}
          >
            {!isMobile && 'Export CSV'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            size={isMobile ? 'small' : 'middle'}
          >
            {isMobile ? 'Create' : 'Create Request'}
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: isMobile ? 8 : 16 }}>
        <Space style={{ width: '100%' }} direction={isMobile ? 'vertical' : 'horizontal'} wrap>
          <Select
            placeholder="Filter by status"
            allowClear
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
            style={{ width: isMobile ? '100%' : 160 }}
            size={isMobile ? 'middle' : 'middle'}
            options={Object.entries(STATUS_LABEL_MAP).map(([value, label]) => ({
              label,
              value,
            }))}
          />
          <Select
            placeholder="Filter by category"
            allowClear
            value={categoryFilter}
            onChange={(value) => { setCategoryFilter(value); setPage(1); }}
            style={{ width: isMobile ? '100%' : 200 }}
            size={isMobile ? 'middle' : 'middle'}
            options={Object.entries(CATEGORY_LABEL_MAP).map(([value, label]) => ({
              label,
              value,
            }))}
          />
        </Space>
      </div>

      {isMobile ? (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">Loading...</Text></div>
          ) : requests.length === 0 ? (
            <Card><Text type="secondary">No maintenance requests found.</Text></Card>
          ) : (
            <>
              {requests.map(renderMobileCard)}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {requests.length} of {pagination?.total || 0}
                </Text>
                {(pagination?.total || 0) > requests.length && (
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
          <Table<MaintenanceRequest>
            columns={columns}
            dataSource={requests}
            loading={isLoading}
            rowKey="maintenanceRequestId"
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              current: page,
              pageSize,
              total: pagination?.total || 0,
              showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} requests`,
            }}
          />
        </Card>
      )}

      {/* Detail Modal */}
      <Modal
        title="Maintenance Request Details"
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setSelectedRequest(null); }}
        footer={null}
        width={600}
      >
        {selectedRequest && (
          <div>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Property">
                {getPropertyName(selectedRequest)}
              </Descriptions.Item>
              <Descriptions.Item label="Unit">
                {selectedRequest.tenant?.unit?.unitNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tenant">
                {getTenantName(selectedRequest)}
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {CATEGORY_LABEL_MAP[selectedRequest.category] || selectedRequest.category}
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={PRIORITY_COLOR_MAP[selectedRequest.priority] || 'default'}>
                  {selectedRequest.priority?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR_MAP[selectedRequest.status] || 'default'}>
                  {STATUS_LABEL_MAP[selectedRequest.status] || selectedRequest.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedRequest.description}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted">
                {dayjs(selectedRequest.createdAt).format('DD MMM YYYY, HH:mm')}
              </Descriptions.Item>
              {selectedRequest.resolvedAt && (
                <Descriptions.Item label="Resolved">
                  {dayjs(selectedRequest.resolvedAt).format('DD MMM YYYY, HH:mm')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {selectedRequest.status === 'pending' && (
                <Button
                  type="primary"
                  onClick={() => handleStatusChange('approved')}
                  loading={updateMutation.isPending}
                >
                  Approve
                </Button>
              )}
              {(selectedRequest.status === 'pending' || selectedRequest.status === 'approved') && (
                <Button
                  onClick={() => handleStatusChange('in_progress')}
                  loading={updateMutation.isPending}
                >
                  Mark In Progress
                </Button>
              )}
              {selectedRequest.status !== 'completed' && selectedRequest.status !== 'cancelled' && (
                <Button
                  type="primary"
                  style={{ background: '#52c41a' }}
                  onClick={() => handleStatusChange('completed')}
                  loading={updateMutation.isPending}
                >
                  Mark Completed
                </Button>
              )}
              {selectedRequest.status !== 'completed' && selectedRequest.status !== 'cancelled' && (
                <Button
                  danger
                  onClick={() => handleStatusChange('cancelled')}
                  loading={updateMutation.isPending}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Completion Modal */}
      <Modal
        title="Complete Maintenance Request"
        open={completionModalOpen}
        onOk={handleCompleteWithExpense}
        onCancel={() => {
          setCompletionModalOpen(false);
          completionForm.resetFields();
        }}
        confirmLoading={updateMutation.isPending}
        okText="Complete & Record Expense"
      >
        <p style={{ marginBottom: 16 }}>
          Record the cost of this maintenance work. Leave blank or zero if no expense should be logged.
        </p>
        <Form form={completionForm} layout="vertical">
          <Form.Item
            name="expenseAmount"
            label="Expense Amount (KES)"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="0.00"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => (value?.replace(/,/g, '') || '0') as unknown as 0}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Maintenance Request Modal */}
      <Modal
        title="Create Maintenance Request"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        confirmLoading={createMutation.isPending}
        okText="Create Request"
        width={560}
      >
        <Form
          form={createForm}
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
              onChange={() => createForm.setFieldValue('tenantId', undefined)}
              options={propertiesList.map((p) => ({
                label: `${p.name} - ${p.location}`,
                value: p.propertyId,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="tenantId"
            label="Tenant (optional — leave empty for general property maintenance)"
          >
            <Select
              placeholder={selectedPropertyId ? 'Select a tenant (optional)' : 'Select a property first'}
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={!selectedPropertyId}
              options={tenantsList.map((t) => ({
                label: `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim() + (t.unit?.unitNumber ? ` (${t.unit.unitNumber})` : ''),
                value: t.tenantId,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select
              placeholder="Select category"
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
              placeholder="Select priority"
              allowClear
              options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
                { label: 'Urgent', value: 'urgent' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input.TextArea rows={3} placeholder="Describe the maintenance issue..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
