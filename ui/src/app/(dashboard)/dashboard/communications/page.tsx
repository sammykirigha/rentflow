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
  Space,
  Descriptions,
  Dropdown,
} from 'antd';
import {
  SendOutlined,
  MailOutlined,
  NotificationOutlined,
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  MoreOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  communicationsApi,
  type Notification,
  type SendNotificationInput,
  type SendBulkReminderInput,
  type SendBulkMessageInput,
} from '@/lib/api/communications.api';
import { tenantsApi } from '@/lib/api/tenants.api';
import { parseError } from '@/lib/api/parseError';
import type { Tenant } from '@/types/tenants';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
import dayjs from 'dayjs';

const { Title } = Typography;

const CHANNEL_COLOR_MAP: Record<string, string> = {
  sms: 'green',
  email: 'blue',
  both: 'purple',
};

const TYPE_LABEL_MAP: Record<string, string> = {
  invoice_sent: 'Invoice Sent',
  receipt_sent: 'Receipt Sent',
  payment_reminder: 'Payment Reminder',
  penalty_notice: 'Penalty Notice',
  maintenance_update: 'Maintenance Update',
  lease_renewal: 'Lease Renewal',
  general: 'General',
};

export default function CommunicationsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkMessageModalOpen, setIsBulkMessageModalOpen] = useState(false);
  const [viewNotification, setViewNotification] = useState<Notification | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sendForm] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [bulkMessageForm] = Form.useForm();

  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['communications', typeFilter, statusFilter, page, pageSize],
    queryFn: () => communicationsApi.getAll({ type: typeFilter, status: statusFilter, page, limit: pageSize }),
    enabled: isAuthenticated,
  });

  const notifications: Notification[] = Array.isArray(data?.data) ? data.data : [];
  const paginationData = data?.pagination;

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants', 'all'],
    queryFn: () => tenantsApi.getAll({ limit: 200 }),
    enabled: isSendModalOpen,
  });

  const tenantsList: Tenant[] = Array.isArray(tenantsData?.data) ? tenantsData.data : [];

  const sendMutation = useMutation({
    mutationFn: (values: SendNotificationInput) => communicationsApi.send(values),
    onSuccess: () => {
      message.success('Notification sent successfully');
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      setIsSendModalOpen(false);
      sendForm.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to send notification'));
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (values: SendBulkReminderInput) => communicationsApi.sendBulkReminder(values),
    onSuccess: (result) => {
      message.success(`Bulk reminder sent to ${result.count} tenants`);
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      setIsBulkModalOpen(false);
      bulkForm.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to send bulk reminder'));
    },
  });

  const bulkMessageMutation = useMutation({
    mutationFn: (values: SendBulkMessageInput) => communicationsApi.sendBulkMessage(values),
    onSuccess: (result) => {
      message.success(`Message sent to ${result.count} tenants`);
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      setIsBulkMessageModalOpen(false);
      bulkMessageForm.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to send bulk message'));
    },
  });

  const resendMutation = useMutation({
    mutationFn: (notificationId: string) => communicationsApi.resend(notificationId),
    onSuccess: () => {
      message.success('Notification resent successfully');
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to resend notification'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => communicationsApi.delete(notificationId),
    onSuccess: () => {
      message.success('Notification deleted');
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to delete notification'));
    },
  });

  const handleSend = async () => {
    try {
      const values = await sendForm.validateFields();
      sendMutation.mutate(values);
    } catch {
      // validation errors shown inline
    }
  };

  const handleBulkSend = async () => {
    try {
      const values = await bulkForm.validateFields();
      bulkMutation.mutate(values);
    } catch {
      // validation errors shown inline
    }
  };

  const handleBulkMessageSend = async () => {
    try {
      const values = await bulkMessageForm.validateFields();
      bulkMessageMutation.mutate(values);
    } catch {
      // validation errors shown inline
    }
  };

  const columns: ColumnsType<Notification> = [
    {
      title: 'Tenant',
      key: 'tenant',
      render: (_: unknown, record: Notification) => {
        const firstName = record.tenant?.user?.firstName || '';
        const lastName = record.tenant?.user?.lastName || '';
        return `${firstName} ${lastName}`.trim() || '-';
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag>{TYPE_LABEL_MAP[type] || type}</Tag>
      ),
      filters: Object.entries(TYPE_LABEL_MAP).map(([value, text]) => ({ text, value })),
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (channel: string) => (
        <Tag color={CHANNEL_COLOR_MAP[channel] || 'default'}>
          {channel?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      render: (value: string) => value || '-',
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      width: 200,
    },
    {
      title: 'Sent At',
      dataIndex: 'sentAt',
      key: 'sentAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY, HH:mm') : 'Pending',
      sorter: (a, b) => new Date(a.sentAt || 0).getTime() - new Date(b.sentAt || 0).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Notification) => {
        if (status === 'sent') return <Tag color="green">Sent</Tag>;
        if (status === 'failed') return <Tag color="red">Failed ({record.retryCount})</Tag>;
        return <Tag color="orange">Pending</Tag>;
      },
      filters: [
        { text: 'Sent', value: 'sent' },
        { text: 'Failed', value: 'failed' },
        { text: 'Pending', value: 'pending' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 70,
      render: (_: unknown, record: Notification) => {
        const items = [
          {
            key: 'view',
            label: 'View',
            icon: <EyeOutlined />,
            onClick: () => setViewNotification(record),
          },
          ...(record.status === 'failed' || record.status === 'pending'
            ? [{
                key: 'resend',
                label: 'Resend',
                icon: <ReloadOutlined />,
                onClick: () => resendMutation.mutate(record.notificationId),
              }]
            : []),
          {
            key: 'delete',
            label: 'Delete',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Delete notification',
                content: 'Are you sure you want to delete this notification?',
                okText: 'Yes',
                cancelText: 'No',
                okButtonProps: { danger: true },
                onOk: () => deleteMutation.mutate(record.notificationId),
              });
            },
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <MailOutlined style={{ marginRight: 8 }} />
          Communications
        </Title>
        <Space>
          <Button
            icon={<ExportOutlined />}
            onClick={() => {
              const csvColumns: CsvColumn<Notification>[] = [
                { header: 'Tenant', accessor: (r) => `${r.tenant?.user?.firstName || ''} ${r.tenant?.user?.lastName || ''}`.trim() },
                { header: 'Type', accessor: (r) => TYPE_LABEL_MAP[r.type] || r.type },
                { header: 'Channel', accessor: (r) => r.channel?.toUpperCase() || '' },
                { header: 'Subject', accessor: (r) => r.subject || '' },
                { header: 'Message', accessor: (r) => r.message || '' },
                { header: 'Sent At', accessor: (r) => r.sentAt ? dayjs(r.sentAt).format('DD MMM YYYY, HH:mm') : 'Pending' },
                { header: 'Status', accessor: (r) => r.status?.charAt(0).toUpperCase() + r.status?.slice(1) },
              ];
              downloadCsv(notifications, csvColumns, 'communications.csv');
            }}
            disabled={isLoading || notifications.length === 0}
          >
            Export CSV
          </Button>
          <Button
            icon={<SendOutlined />}
            onClick={() => setIsSendModalOpen(true)}
          >
            Send Message
          </Button>
          <Button
            icon={<MailOutlined />}
            onClick={() => setIsBulkMessageModalOpen(true)}
          >
            Bulk Message
          </Button>
          <Button
            type="primary"
            icon={<NotificationOutlined />}
            onClick={() => setIsBulkModalOpen(true)}
          >
            Bulk Reminder
          </Button>
        </Space>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by type"
            allowClear
            value={typeFilter}
            onChange={(value) => { setTypeFilter(value); setPage(1); }}
            style={{ width: 200 }}
            options={Object.entries(TYPE_LABEL_MAP).map(([value, label]) => ({
              label,
              value,
            }))}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
            style={{ width: 160 }}
            options={[
              { label: 'Sent', value: 'sent' },
              { label: 'Failed', value: 'failed' },
              { label: 'Pending', value: 'pending' },
            ]}
          />
        </Space>

        <Table<Notification>
          columns={columns}
          dataSource={notifications}
          loading={isLoading}
          rowKey="notificationId"
          pagination={{
            current: page,
            pageSize,
            total: paginationData?.total || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} notifications`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      {/* Send Individual Message Modal */}
      <Modal
        title="Send Notification"
        open={isSendModalOpen}
        onOk={handleSend}
        onCancel={() => {
          setIsSendModalOpen(false);
          sendForm.resetFields();
        }}
        confirmLoading={sendMutation.isPending}
        okText="Send"
        width={520}
      >
        <Form
          form={sendForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="tenantId"
            label="Tenant"
            rules={[{ required: true, message: 'Please select a tenant' }]}
          >
            <Select
              placeholder="Select a tenant"
              showSearch
              optionFilterProp="label"
              options={tenantsList.map((t) => ({
                label: `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim() +
                  (t.unit?.unitNumber ? ` (${t.unit.unitNumber})` : ''),
                value: t.tenantId,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: 'Please select a type' }]}
          >
            <Select
              placeholder="Notification type"
              options={Object.entries(TYPE_LABEL_MAP).map(([value, label]) => ({
                label,
                value,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="channel"
            label="Channel"
            rules={[{ required: true, message: 'Please select a channel' }]}
          >
            <Select
              placeholder="Select channel"
              options={[
                { label: 'SMS', value: 'sms' },
                { label: 'Email', value: 'email' },
                { label: 'Both', value: 'both' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="subject"
            label="Subject (for email)"
          >
            <Input placeholder="Email subject line" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Please enter a message' }]}
          >
            <Input.TextArea rows={4} placeholder="Type your message here..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Notification Modal */}
      <Modal
        title="Notification Details"
        open={!!viewNotification}
        onCancel={() => setViewNotification(null)}
        footer={[
          <Button key="close" onClick={() => setViewNotification(null)}>
            Close
          </Button>,
          ...(viewNotification?.status === 'failed' || viewNotification?.status === 'pending'
            ? [
                <Button
                  key="resend"
                  type="primary"
                  icon={<ReloadOutlined />}
                  loading={resendMutation.isPending}
                  onClick={() => {
                    resendMutation.mutate(viewNotification.notificationId);
                    setViewNotification(null);
                  }}
                >
                  Resend
                </Button>,
              ]
            : []),
        ]}
        width={600}
      >
        {viewNotification && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Tenant">
              {`${viewNotification.tenant?.user?.firstName || ''} ${viewNotification.tenant?.user?.lastName || ''}`.trim() || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag>{TYPE_LABEL_MAP[viewNotification.type] || viewNotification.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Channel">
              <Tag color={CHANNEL_COLOR_MAP[viewNotification.channel] || 'default'}>
                {viewNotification.channel?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {viewNotification.status === 'sent' && <Tag color="green">Sent</Tag>}
              {viewNotification.status === 'failed' && <Tag color="red">Failed ({viewNotification.retryCount})</Tag>}
              {viewNotification.status === 'pending' && <Tag color="orange">Pending</Tag>}
            </Descriptions.Item>
            {viewNotification.subject && (
              <Descriptions.Item label="Subject">{viewNotification.subject}</Descriptions.Item>
            )}
            <Descriptions.Item label="Message">
              <div style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                {viewNotification.message}
              </div>
            </Descriptions.Item>
            {viewNotification.failReason && (
              <Descriptions.Item label="Fail Reason">
                <Tag color="red">{viewNotification.failReason}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Sent At">
              {viewNotification.sentAt ? dayjs(viewNotification.sentAt).format('DD MMM YYYY, HH:mm') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {dayjs(viewNotification.createdAt).format('DD MMM YYYY, HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Bulk Reminder Modal */}
      <Modal
        title="Send Bulk Reminder"
        open={isBulkModalOpen}
        onOk={handleBulkSend}
        onCancel={() => {
          setIsBulkModalOpen(false);
          bulkForm.resetFields();
        }}
        confirmLoading={bulkMutation.isPending}
        okText="Send to All Unpaid"
        width={520}
      >
        <p style={{ marginBottom: 16, color: '#666' }}>
          This will send a payment reminder to all tenants with unpaid, overdue, or partially paid invoices.
        </p>
        <Form
          form={bulkForm}
          layout="vertical"
          initialValues={{ type: 'payment_reminder' }}
        >
          <Form.Item
            name="channel"
            label="Channel"
            rules={[{ required: true, message: 'Please select a channel' }]}
          >
            <Select
              placeholder="Select channel"
              options={[
                { label: 'SMS', value: 'sms' },
                { label: 'Email', value: 'email' },
                { label: 'Both', value: 'both' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="subject"
            label="Subject (for email)"
          >
            <Input placeholder="Payment Reminder" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Please enter a message' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Dear tenant, this is a reminder that your rent payment is due..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Message Modal */}
      <Modal
        title="Send Bulk Message"
        open={isBulkMessageModalOpen}
        onOk={handleBulkMessageSend}
        onCancel={() => {
          setIsBulkMessageModalOpen(false);
          bulkMessageForm.resetFields();
        }}
        confirmLoading={bulkMessageMutation.isPending}
        okText="Send to All Tenants"
        width={520}
      >
        <p style={{ marginBottom: 16, color: '#666' }}>
          This will send a general message to all active tenants regardless of their payment status.
        </p>
        <Form
          form={bulkMessageForm}
          layout="vertical"
        >
          <Form.Item
            name="channel"
            label="Channel"
            rules={[{ required: true, message: 'Please select a channel' }]}
          >
            <Select
              placeholder="Select channel"
              options={[
                { label: 'SMS', value: 'sms' },
                { label: 'Email', value: 'email' },
                { label: 'Both', value: 'both' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="subject"
            label="Subject (for email)"
          >
            <Input placeholder="Important Notice from RentFlow" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Please enter a message' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Dear tenant, we would like to inform you..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
