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
  Grid,
  Spin,
  Drawer,
  Descriptions,
  Divider,
  Upload,
  Image,
} from 'antd';
import {
  PlusOutlined,
  ToolOutlined,
  CloseCircleOutlined,
  ExportOutlined,
  EyeOutlined,
  UploadOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { maintenanceApi } from '@/lib/api/expenses.api';
import { uploadFileDirect } from '@/lib/api/upload.api';
import { getFileUrl } from '@/lib/utils';
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

export default function TenantMaintenancePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm();
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { isAuthenticated, user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['my-maintenance', page, pageSize],
    queryFn: () => maintenanceApi.getMy({ page, limit: pageSize }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
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
      setPhotoKeys([]);
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
      setDetailOpen(false);
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to cancel request'));
    },
  });

  const handleCancel = (id: string) => {
    Modal.confirm({
      title: 'Cancel Maintenance Request',
      content: 'Are you sure you want to cancel this request?',
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
        photos: photoKeys.length > 0 ? photoKeys : undefined,
      };
      createMutation.mutate(payload);
    } catch {
      // validation errors shown inline
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (photoKeys.length >= 3) {
      message.warning('Maximum 3 photos allowed');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadFileDirect(file);
      if (result?.key) {
        setPhotoKeys((prev) => [...prev, result.key]);
      } else {
        message.error('Failed to upload photo');
      }
    } finally {
      setUploading(false);
    }
  };

  const openDetail = (req: MaintenanceRequest) => {
    setSelectedRequest(req);
    setDetailOpen(true);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await maintenanceApi.getMy({ limit: 10000 });
      const allData: MaintenanceRequest[] = Array.isArray(all?.data) ? all.data : [];
      const csvColumns: CsvColumn<MaintenanceRequest>[] = [
        { header: 'Description', accessor: (r) => r.description },
        { header: 'Category', accessor: (r) => CATEGORY_LABEL_MAP[r.category] || r.category },
        { header: 'Priority', accessor: (r) => r.priority?.toUpperCase() || '' },
        { header: 'Status', accessor: (r) => STATUS_LABEL_MAP[r.status] || r.status },
        { header: 'Submitted', accessor: (r) => r.createdAt ? dayjs(r.createdAt).format('DD MMM YYYY') : '' },
        { header: 'Resolved', accessor: (r) => r.resolvedAt ? dayjs(r.resolvedAt).format('DD MMM YYYY') : '' },
      ];
      downloadCsv(allData, csvColumns, 'my-maintenance.csv');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<MaintenanceRequest> = [
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Category', dataIndex: 'category', key: 'category',
      render: (category: ExpenseCategory) => <Tag>{CATEGORY_LABEL_MAP[category] || category}</Tag>,
    },
    {
      title: 'Priority', dataIndex: 'priority', key: 'priority',
      render: (priority: ExpensePriority) => (
        <Tag color={PRIORITY_COLOR_MAP[priority] || 'default'}>{priority?.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: ExpenseStatus) => (
        <Tag color={STATUS_COLOR_MAP[status] || 'default'}>{STATUS_LABEL_MAP[status] || status}</Tag>
      ),
    },
    {
      title: 'Submitted', dataIndex: 'createdAt', key: 'createdAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: '', key: 'actions', width: 60,
      render: (_: unknown, record: MaintenanceRequest) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
      ),
    },
  ];

  const renderMobileCard = (req: MaintenanceRequest) => (
    <Card
      key={req.maintenanceRequestId}
      size="small"
      style={{ marginBottom: 8, cursor: 'pointer' }}
      styles={{ body: { padding: '12px 14px' } }}
      onClick={() => openDetail(req)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ flex: 1, marginRight: 8 }}>
          <Text strong style={{ fontSize: 14, display: 'block' }}>
            {req.description.length > 60 ? req.description.slice(0, 60) + '...' : req.description}
          </Text>
        </div>
        <Tag color={STATUS_COLOR_MAP[req.status] || 'default'} style={{ margin: 0, flexShrink: 0 }}>
          {STATUS_LABEL_MAP[req.status] || req.status}
        </Tag>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <Tag style={{ margin: 0 }}>{CATEGORY_LABEL_MAP[req.category] || req.category}</Tag>
        <Tag color={PRIORITY_COLOR_MAP[req.priority] || 'default'} style={{ margin: 0 }}>
          {req.priority?.toUpperCase()}
        </Tag>
        {req.photos && req.photos.length > 0 && (
          <Tag style={{ margin: 0 }} icon={<CameraOutlined />}>{req.photos.length} photo{req.photos.length > 1 ? 's' : ''}</Tag>
        )}
      </div>
      <Text type="secondary" style={{ fontSize: 11 }}>
        {req.createdAt ? dayjs(req.createdAt).format('DD MMM YYYY') : '-'}
      </Text>
    </Card>
  );

  const renderDetail = () => {
    if (!selectedRequest) return null;
    const req = selectedRequest;

    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Tag color={STATUS_COLOR_MAP[req.status] || 'default'} style={{ fontSize: 14, padding: '4px 16px' }}>
            {STATUS_LABEL_MAP[req.status] || req.status}
          </Tag>
        </div>

        <Descriptions column={1} size="small" labelStyle={{ fontWeight: 600, width: 100 }}>
          <Descriptions.Item label="Category">
            <Tag>{CATEGORY_LABEL_MAP[req.category] || req.category}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Priority">
            <Tag color={PRIORITY_COLOR_MAP[req.priority] || 'default'}>{req.priority?.toUpperCase()}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Submitted">
            {req.createdAt ? dayjs(req.createdAt).format('DD MMMM YYYY, HH:mm') : '-'}
          </Descriptions.Item>
          {req.resolvedAt && (
            <Descriptions.Item label="Resolved">
              {dayjs(req.resolvedAt).format('DD MMMM YYYY, HH:mm')}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider style={{ margin: '12px 0' }}>Description</Divider>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{req.description}</Text>

        {req.photos && req.photos.length > 0 && (
          <>
            <Divider style={{ margin: '12px 0' }}>Photos</Divider>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Image.PreviewGroup>
                {req.photos.map((key, idx) => (
                  <Image
                    key={idx}
                    src={getFileUrl(key)}
                    width={100}
                    height={100}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    alt={`Photo ${idx + 1}`}
                  />
                ))}
              </Image.PreviewGroup>
            </div>
          </>
        )}

        {req.status === 'pending' && (
          <div style={{ marginTop: 20 }}>
            <Button
              danger
              block
              icon={<CloseCircleOutlined />}
              onClick={() => handleCancel(req.maintenanceRequestId)}
              loading={cancelMutation.isPending}
            >
              Cancel Request
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobile ? 8 : 16,
        gap: 8,
      }}>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          <ToolOutlined style={{ marginRight: 8 }} />
          Maintenance
        </Title>
        <Space size={isMobile ? 4 : 8}>
          <Button
            icon={<ExportOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={isLoading || requests.length === 0}
            size={isMobile ? 'small' : 'middle'}
            aria-label="Export CSV"
          >
            {!isMobile && 'Export CSV'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            size={isMobile ? 'small' : 'middle'}
          >
            {isMobile ? 'New' : 'New Request'}
          </Button>
        </Space>
      </div>

      {isMobile ? (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : requests.length === 0 ? (
            <Empty description="No maintenance requests yet" />
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
            locale={{ emptyText: <Empty description="No maintenance requests yet" /> }}
            onRow={(record) => ({ onClick: () => openDetail(record), style: { cursor: 'pointer' } })}
            pagination={{
              current: page,
              pageSize,
              total: pagination?.total || 0,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
          />
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        title="Submit Maintenance Request"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setPhotoKeys([]);
        }}
        confirmLoading={createMutation.isPending}
        okText="Submit Request"
        width={isMobile ? '95vw' : 520}
        centered={isMobile}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select
              placeholder="What type of issue?"
              options={Object.entries(CATEGORY_LABEL_MAP).map(([value, label]) => ({ label, value }))}
            />
          </Form.Item>

          <Form.Item name="priority" label="Priority">
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
            rules={[
              { required: true, message: 'Please describe the issue' },
              { min: 10, message: 'Please provide at least 10 characters' },
              { max: 500, message: 'Description too long (max 500 characters)' },
            ]}
          >
            <Input.TextArea
              rows={4}
              showCount
              maxLength={500}
              placeholder="Describe the maintenance issue in detail..."
            />
          </Form.Item>

          <Form.Item label={`Photos (${photoKeys.length}/3)`}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {photoKeys.map((key, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <Image
                    src={getFileUrl(key)}
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    alt={`Upload ${idx + 1}`}
                  />
                  <Button
                    type="text"
                    size="small"
                    danger
                    style={{ position: 'absolute', top: -4, right: -4, background: '#fff', borderRadius: '50%', padding: 2, lineHeight: 1, height: 'auto' }}
                    onClick={() => setPhotoKeys((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <CloseCircleOutlined />
                  </Button>
                </div>
              ))}
              {photoKeys.length < 3 && (
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={async ({ file }) => {
                    await handlePhotoUpload(file as File);
                  }}
                >
                  <Button
                    icon={<UploadOutlined />}
                    loading={uploading}
                    style={{ width: 80, height: 80 }}
                  >
                    {!uploading && 'Add'}
                  </Button>
                </Upload>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
              Upload up to 3 photos showing the issue
            </Text>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title="Maintenance Request"
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedRequest(null); }}
        width={isMobile ? '100%' : 480}
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '85vh' : undefined}
      >
        {renderDetail()}
      </Drawer>
    </div>
  );
}
