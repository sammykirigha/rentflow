"use client";

import { Avatar, Card, Col, Descriptions, Grid, Row, Tag, Typography } from "antd";
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
const { useBreakpoint } = Grid;

export default function ProfilePage() {
  const user = useUserStore((state) => state.user);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Profile Header */}
      <Card style={{ marginBottom: isMobile ? 12 : 24 }} size={isMobile ? 'small' : 'default'}>
        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 16 : 24,
          flexWrap: 'wrap',
        }}>
          <Avatar
            size={isMobile ? 64 : 96}
            icon={<UserOutlined />}
            src={user?.avatarUrl}
            style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              {user?.firstName} {user?.lastName}
            </Title>
            <Text type="secondary" style={{ fontSize: isMobile ? 13 : 15, display: 'block', marginTop: 4 }}>
              {user?.userRole?.name || 'User'}
            </Text>
            <div style={{ marginTop: isMobile ? 8 : 12, display: 'flex', flexWrap: 'wrap', gap: isMobile ? 8 : 16 }}>
              <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
                <MailOutlined style={{ marginRight: 6 }} />
                {user?.email}
              </Text>
              {user?.phone && (
                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
                  <PhoneOutlined style={{ marginRight: 6 }} />
                  {user.phone}
                </Text>
              )}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag color={user?.status === 'active' ? 'green' : 'red'}>
                {user?.status === 'active' ? 'Active' : user?.status || 'Unknown'}
              </Tag>
              {user?.emailVerified && (
                <Tag icon={<SafetyCertificateOutlined />} color="blue">
                  {isMobile ? 'Email' : 'Email Verified'}
                </Tag>
              )}
              {user?.phoneVerified && (
                <Tag icon={<SafetyCertificateOutlined />} color="blue">
                  {isMobile ? 'Phone' : 'Phone Verified'}
                </Tag>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Account Details */}
      <Card
        title={<span><CalendarOutlined style={{ marginRight: 8 }} />Account Details</span>}
        style={{ marginBottom: isMobile ? 12 : 24 }}
        size={isMobile ? 'small' : 'default'}
      >
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          colon={false}
          labelStyle={{ fontWeight: 500, color: '#595959', fontSize: isMobile ? 12 : 14 }}
          contentStyle={{ fontSize: isMobile ? 12 : 14 }}
          size={isMobile ? 'small' : 'default'}
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
            <Text copyable style={{ fontSize: isMobile ? 11 : 12 }}>{user?.userId}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={isMobile ? 0 : 24}>
        {/* Edit Profile */}
        <Col xs={24} lg={14} style={{ marginBottom: isMobile ? 12 : 24 }}>
          <Card
            title={
              <span>
                <EditOutlined style={{ marginRight: 8 }} />
                Edit Profile
              </span>
            }
            style={{ height: '100%' }}
            size={isMobile ? 'small' : 'default'}
          >
            <UpdateUserProfileForm />
          </Card>
        </Col>

        {/* Security */}
        <Col xs={24} lg={10} style={{ marginBottom: isMobile ? 12 : 24 }}>
          <Card
            title={
              <span>
                <LockOutlined style={{ marginRight: 8 }} />
                Change Password
              </span>
            }
            style={{ height: '100%' }}
            size={isMobile ? 'small' : 'default'}
          >
            <SecuritySettings />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
