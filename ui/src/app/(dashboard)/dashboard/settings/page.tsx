'use client';

import {
  SettingOutlined,
  PictureOutlined,
  TeamOutlined,
  BellOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Card, Menu, Typography } from 'antd';
import { useState } from 'react';
import GeneralSettingsTab from './components/general-settings-tab';
import BrandingTab from './components/branding-tab';
import TeamManagementTab from './components/team-management-tab';
import NotificationSettingsTab from './components/notification-settings-tab';
import InvoiceSettingsTab from './components/invoice-settings-tab';

const { Title, Text } = Typography;

const menuItems = [
  { key: 'general', icon: <SettingOutlined />, label: 'General' },
  { key: 'branding', icon: <PictureOutlined />, label: 'Branding' },
  { key: 'team', icon: <TeamOutlined />, label: 'Team' },
  { key: 'notifications', icon: <BellOutlined />, label: 'Notifications' },
  { key: 'invoices', icon: <FileTextOutlined />, label: 'Invoices' },
];

const sectionContent: Record<string, React.ReactNode> = {
  general: <GeneralSettingsTab />,
  branding: <BrandingTab />,
  team: <TeamManagementTab />,
  notifications: <NotificationSettingsTab />,
  invoices: <InvoiceSettingsTab />,
};

export default function SettingsPage() {
  const [selectedKey, setSelectedKey] = useState('general');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 4 }}>Settings</Title>
        <Text type="secondary">Manage your platform configuration, branding, team, and notifications.</Text>
      </div>
      <Card bodyStyle={{ padding: 0 }}>
        <div style={{ display: 'flex', minHeight: 480 }}>
          <div
            style={{
              width: 220,
              borderRight: '1px solid #f0f0f0',
              flexShrink: 0,
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              onClick={(e) => setSelectedKey(e.key)}
              items={menuItems}
              style={{ border: 'none', paddingTop: 8 }}
            />
          </div>
          <div style={{ flex: 1, padding: 24 }}>
            {sectionContent[selectedKey]}
          </div>
        </div>
      </Card>
    </div>
  );
}
