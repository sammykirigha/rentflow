"use client";

import { Avatar, Card, Col, Descriptions, Row, Tag, Typography } from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useUserStore } from "@/stores/user.store";
import UpdateUserProfileForm from "./components/update-user-form";
import SecuritySettings from "./components/security-settings";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function ProfilePage() {
  const user = useUserStore((state) => state.user);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Profile Header */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}>
          <Avatar
            size={96}
            icon={<UserOutlined />}
            src={user?.avatarUrl}
            style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <Title level={3} style={{ margin: 0 }}>
              {user?.firstName} {user?.lastName}
            </Title>
            <Text type="secondary" style={{ fontSize: 15, display: 'block', marginTop: 4 }}>
              {user?.userRole?.name || 'User'}
            </Text>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <Text type="secondary">
                <MailOutlined style={{ marginRight: 6 }} />
                {user?.email}
              </Text>
              {user?.phone && (
                <Text type="secondary">
                  <PhoneOutlined style={{ marginRight: 6 }} />
                  {user.phone}
                </Text>
              )}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <Tag color={user?.status === 'active' ? 'green' : 'red'}>
                {user?.status === 'active' ? 'Active' : user?.status || 'Unknown'}
              </Tag>
              {user?.emailVerified && (
                <Tag icon={<SafetyCertificateOutlined />} color="blue">Email Verified</Tag>
              )}
              {user?.phoneVerified && (
                <Tag icon={<SafetyCertificateOutlined />} color="blue">Phone Verified</Tag>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Account Details */}
      <Card
        title={<span><CalendarOutlined style={{ marginRight: 8 }} />Account Details</span>}
        style={{ marginBottom: 24 }}
      >
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          colon={false}
          labelStyle={{ fontWeight: 500, color: '#595959' }}
        >
          <Descriptions.Item label="Member Since">
            {user?.createdAt ? dayjs(user.createdAt).format('DD MMMM YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Last Login">
            {user?.lastLoginAt ? dayjs(user.lastLoginAt).format('DD MMM YYYY, HH:mm') : 'Never'}
          </Descriptions.Item>
          <Descriptions.Item label="Role">
            {user?.userRole?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="User ID">
            <Text copyable style={{ fontSize: 12 }}>{user?.userId}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={24}>
        {/* Edit Profile */}
        <Col xs={24} lg={14} style={{ marginBottom: 24 }}>
          <Card
            title={
              <span>
                <EditOutlined style={{ marginRight: 8 }} />
                Edit Profile
              </span>
            }
            style={{ height: '100%' }}
          >
            <UpdateUserProfileForm />
          </Card>
        </Col>

        {/* Security */}
        <Col xs={24} lg={10} style={{ marginBottom: 24 }}>
          <Card
            title={
              <span>
                <LockOutlined style={{ marginRight: 8 }} />
                Change Password
              </span>
            }
            style={{ height: '100%' }}
          >
            <SecuritySettings />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
