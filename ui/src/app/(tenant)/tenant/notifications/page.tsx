"use client";

import { communicationsApi, Notification } from "@/lib/api/communications.api";
import {
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { Card, Table, Tag, Typography, Select, Space, Button } from "antd";
import { useCallback, useEffect, useState } from "react";
import { downloadCsv, type CsvColumn } from "@/lib/csv-export";

const { Title } = Typography;

const notificationTypeLabels: Record<string, string> = {
  invoice_sent: "Invoice Sent",
  receipt_sent: "Receipt Sent",
  payment_reminder: "Payment Reminder",
  penalty_notice: "Penalty Notice",
  maintenance_update: "Maintenance Update",
  lease_renewal: "Lease Renewal",
  general: "General",
  welcome_credentials: "Welcome",
};

const notificationTypeColors: Record<string, string> = {
  invoice_sent: "blue",
  receipt_sent: "green",
  payment_reminder: "orange",
  penalty_notice: "red",
  maintenance_update: "cyan",
  lease_renewal: "purple",
  general: "default",
  welcome_credentials: "geekblue",
};

const channelIcons: Record<string, React.ReactNode> = {
  sms: <MessageOutlined />,
  email: <MailOutlined />,
  both: <BellOutlined />,
};

const statusColors: Record<string, string> = {
  sent: "green",
  pending: "gold",
  failed: "red",
};

export default function TenantNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const fetchNotifications = useCallback(
    async (page = 1, limit = 10, type?: string) => {
      try {
        setLoading(true);
        const data = await communicationsApi.getMy({ page, limit, type });
        setNotifications(data?.data || []);
        setPagination({
          page: data?.pagination?.page || page,
          limit: data?.pagination?.limit || limit,
          total: data?.pagination?.total || 0,
        });
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchNotifications(1, pagination.limit, typeFilter);
  }, [fetchNotifications, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) =>
        new Date(date).toLocaleDateString("en-KE", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 160,
      render: (type: string) => (
        <Tag color={notificationTypeColors[type] || "default"}>
          {notificationTypeLabels[type] || type}
        </Tag>
      ),
    },
    {
      title: "Channel",
      dataIndex: "channel",
      key: "channel",
      width: 100,
      render: (channel: string) => (
        <Space>
          {channelIcons[channel] || <BellOutlined />}
          {channel?.toUpperCase()}
        </Space>
      ),
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      width: 200,
      render: (subject: string) => subject || "—",
    },
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
      ellipsis: true,
      render: (msg: string) => msg || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status] || "default"}>
          {status?.charAt(0).toUpperCase() + status?.slice(1)}
        </Tag>
      ),
    },
  ];

  const typeOptions = Object.entries(notificationTypeLabels).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>My Notifications</Title>
        <Button
          icon={<ExportOutlined />}
          onClick={async () => {
            setExporting(true);
            try {
              const all = await communicationsApi.getMy({ limit: 10000, type: typeFilter });
              const allData: Notification[] = Array.isArray(all?.data) ? all.data : [];
              const csvColumns: CsvColumn<Notification>[] = [
                { header: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                { header: 'Type', accessor: (r) => notificationTypeLabels[r.type] || r.type },
                { header: 'Channel', accessor: (r) => r.channel?.toUpperCase() || '' },
                { header: 'Subject', accessor: (r) => r.subject || '' },
                { header: 'Message', accessor: (r) => r.message || '' },
                { header: 'Status', accessor: (r) => r.status?.charAt(0).toUpperCase() + r.status?.slice(1) },
              ];
              downloadCsv(allData, csvColumns, 'my-notifications.csv');
            } finally {
              setExporting(false);
            }
          }}
          loading={exporting}
          disabled={loading || notifications.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>Filter by type:</span>
            <Select
              allowClear
              placeholder="All types"
              style={{ width: 200 }}
              options={typeOptions}
              value={typeFilter}
              onChange={(val) => setTypeFilter(val)}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={notifications}
          rowKey="notificationId"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} notifications`,
            onChange: (page, pageSize) => fetchNotifications(page, pageSize, typeFilter),
          }}
        />
      </Card>
    </div>
  );
}
