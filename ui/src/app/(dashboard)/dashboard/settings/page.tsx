'use client';

import {
  SettingOutlined,
  PictureOutlined,
  TeamOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { Tabs, Typography } from 'antd';
import GeneralSettingsTab from './components/general-settings-tab';
import BrandingTab from './components/branding-tab';
import TeamManagementTab from './components/team-management-tab';
import NotificationSettingsTab from './components/notification-settings-tab';

const { Title } = Typography;

export default function SettingsPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Settings</Title>
      <Tabs
        defaultActiveKey="general"
        items={[
          {
            key: 'general',
            label: (
              <span>
                <SettingOutlined /> General
              </span>
            ),
            children: <GeneralSettingsTab />,
          },
          {
            key: 'branding',
            label: (
              <span>
                <PictureOutlined /> Branding
              </span>
            ),
            children: <BrandingTab />,
          },
          {
            key: 'team',
            label: (
              <span>
                <TeamOutlined /> Team Management
              </span>
            ),
            children: <TeamManagementTab />,
          },
          {
            key: 'notifications',
            label: (
              <span>
                <BellOutlined /> Notifications
              </span>
            ),
            children: <NotificationSettingsTab />,
          },
        ]}
      />
    </div>
  );
}
