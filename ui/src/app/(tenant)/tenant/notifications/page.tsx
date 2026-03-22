"use client";

import { communicationsApi, Notification } from "@/lib/api/communications.api";
import {
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { Card, Table, Tag, Tooltip, Typography, Select, Button, Grid, Spin, Empty } from "antd";
import { useCallback, useEffect, useState } from "react";
import { downloadCsv, type CsvColumn } from "@/lib/csv-export";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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

  const handleExport = async () => {
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
  };

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
        <span>
          {channelIcons[channel] || <BellOutlined />}{" "}
          {channel?.toUpperCase()}
        </span>
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
      ellipsis: { showTitle: false },
      render: (msg: string) =>
        msg ? (
          <Tooltip title={msg} placement="topLeft">
            <span>{msg}</span>
          </Tooltip>
        ) : (
          "—"
        ),
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

  const renderMobileCard = (notif: Notification) => (
    <Card
      key={notif.notificationId}
      size="small"
      style={{ marginBottom: 8 }}
      styles={{ body: { padding: '12px 14px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <Tag color={notificationTypeColors[notif.type] || "default"} style={{ margin: 0 }}>
          {notificationTypeLabels[notif.type] || notif.type}
        </Tag>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag color={statusColors[notif.status] || "default"} style={{ margin: 0 }}>
            {notif.status?.charAt(0).toUpperCase() + notif.status?.slice(1)}
          </Tag>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            {channelIcons[notif.channel] || <BellOutlined />}
          </span>
        </div>
      </div>
      {notif.subject && (
        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
          {notif.subject}
        </Text>
      )}
      {notif.message && (
        <Text style={{ fontSize: 13, display: 'block', marginBottom: 6, color: '#595959' }}>
          {notif.message.length > 120 ? notif.message.slice(0, 120) + '...' : notif.message}
        </Text>
      )}
      <Text type="secondary" style={{ fontSize: 11 }}>
        {new Date(notif.createdAt).toLocaleDateString("en-KE", {
          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        })}
      </Text>
    </Card>
  );

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobile ? 12 : 16,
        gap: 8,
      }}>
        <Title level={isMobile ? 5 : 3} style={{ margin: 0 }}>Notifications</Title>
        <Button
          icon={<ExportOutlined />}
          onClick={handleExport}
          loading={exporting}
          disabled={loading || notifications.length === 0}
          size={isMobile ? 'small' : 'middle'}
        >
          {!isMobile && 'Export CSV'}
        </Button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Select
          allowClear
          placeholder="Filter by type"
          style={{ width: isMobile ? '100%' : 200 }}
          options={typeOptions}
          value={typeFilter}
          onChange={(val) => setTypeFilter(val)}
          size={isMobile ? 'middle' : 'middle'}
        />
      </div>

      {isMobile ? (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : notifications.length === 0 ? (
            <Empty description="No notifications yet" />
          ) : (
            <>
              {notifications.map(renderMobileCard)}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {notifications.length} of {pagination.total} notifications
                </Text>
                {pagination.total > notifications.length && (
                  <div style={{ marginTop: 8 }}>
                    <Button
                      size="small"
                      onClick={() => fetchNotifications(1, pagination.limit + 10, typeFilter)}
                    >
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
      )}
    </div>
  );
}
