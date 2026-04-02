'use client';

import {
  PictureOutlined,
  TeamOutlined,
  BellOutlined,
  FileTextOutlined,
  MobileOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { Card, Grid, Menu, Tabs, Typography } from 'antd';
import { useState } from 'react';
import OrganizationTab from './components/organization-tab';
import BrandingTab from './components/branding-tab';
import TeamManagementTab from './components/team-management-tab';
import NotificationSettingsTab from './components/notification-settings-tab';
import InvoiceSettingsTab from './components/invoice-settings-tab';
import MpesaSettingsTab from './components/mpesa-settings-tab';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const menuItems = [
  { key: 'organization', icon: <BankOutlined />, label: 'Organization' },
  { key: 'branding', icon: <PictureOutlined />, label: 'Branding' },
  { key: 'team', icon: <TeamOutlined />, label: 'Team' },
  { key: 'notifications', icon: <BellOutlined />, label: 'Notifications' },
  { key: 'invoices', icon: <FileTextOutlined />, label: 'Invoices' },
  { key: 'mpesa', icon: <MobileOutlined />, label: 'M-Pesa' },
];

const sectionContent: Record<string, React.ReactNode> = {
  organization: <OrganizationTab />,
  branding: <BrandingTab />,
  team: <TeamManagementTab />,
  notifications: <NotificationSettingsTab />,
  invoices: <InvoiceSettingsTab />,
  mpesa: <MpesaSettingsTab />,
};

export default function SettingsPage() {
  const [selectedKey, setSelectedKey] = useState('organization');
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div>
      <div style={{ marginBottom: isMobile ? 12 : 24 }}>
        <Title level={isMobile ? 5 : 4} style={{ marginBottom: 4 }}>Settings</Title>
        <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
          Manage your organization settings, branding, team, and integrations.
        </Text>
      </div>

      {isMobile ? (
        <div>
          <Tabs
            activeKey={selectedKey}
            onChange={(key) => setSelectedKey(key)}
            size="small"
            tabBarStyle={{ marginBottom: 0 }}
            items={menuItems.map((item) => ({
              key: item.key,
              label: (
                <span style={{ fontSize: 12 }}>
                  {item.icon}
                  <span style={{ marginLeft: 4 }}>{item.label}</span>
                </span>
              ),
              children: (
                <Card size="small" style={{ marginTop: 8 }}>
                  {sectionContent[item.key]}
                </Card>
              ),
            }))}
          />
        </div>
      ) : (
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
      )}
    </div>
  );
}
