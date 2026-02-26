'use client';

import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { MailOutlined, MessageOutlined, BellOutlined } from '@ant-design/icons';
import { App, Card, Spin, Switch } from 'antd';

interface NotificationRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  settingKey: 'emailNotifications' | 'smsNotifications' | 'adminAlerts';
}

function NotificationRow({ icon, title, description, checked, settingKey }: NotificationRowProps) {
  const updateSettings = useUpdateSettings();
  const { message: messageApi } = App.useApp();

  const handleChange = async (value: boolean) => {
    try {
      await updateSettings.mutateAsync({ [settingKey]: value });
      messageApi.success(`${title} ${value ? 'enabled' : 'disabled'}`);
    } catch {
      messageApi.error('Failed to update setting');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20, color: '#1890ff' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 500 }}>{title}</div>
          <div style={{ color: '#666', fontSize: 13 }}>{description}</div>
        </div>
      </div>
      <Switch
        checked={checked}
        onChange={handleChange}
        loading={updateSettings.isPending}
      />
    </div>
  );
}

export default function NotificationSettingsTab() {
  const { data: settings, isLoading } = useSettings();

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '40px auto' }} />;
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Notifications</div>
        <div style={{ color: '#666', fontSize: 13 }}>
          Control how tenants receive invoices, reminders, and receipts. Enable or disable each notification channel below.
        </div>
      </div>
      <Card>
        <NotificationRow
          icon={<MailOutlined />}
          title="Email Notifications"
          description="Send invoice and receipt notifications via email"
          checked={settings?.emailNotifications ?? false}
          settingKey="emailNotifications"
        />
        <NotificationRow
          icon={<MessageOutlined />}
          title="SMS Notifications"
          description="Send invoice and payment reminders via SMS"
          checked={settings?.smsNotifications ?? false}
          settingKey="smsNotifications"
        />
        <NotificationRow
          icon={<BellOutlined />}
          title="Admin Alerts"
          description="Receive alerts for overdue payments, maintenance requests, and system events"
          checked={settings?.adminAlerts ?? false}
          settingKey="adminAlerts"
        />
      </Card>
    </div>
  );
}
