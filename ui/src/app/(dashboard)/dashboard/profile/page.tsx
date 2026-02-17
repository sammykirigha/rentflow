"use client";

import { Card, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import UpdateUserProfileForm from "./components/update-user-form";
import SecuritySettings from "./components/security-settings";

const { Title, Text } = Typography;

export default function ProfilePage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined />
            Profile Management
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Update your profile information
        </Text>
        <UpdateUserProfileForm />
      </Card>

      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LockOutlined />
            Security Settings
          </span>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Manage your account security
        </Text>
        <SecuritySettings />
      </Card>
    </div>
  );
}
