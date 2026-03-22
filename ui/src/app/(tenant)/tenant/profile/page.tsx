"use client";

import { Avatar, Card, Col, Descriptions, Row, Tag, Typography, Grid } from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  HomeOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useUserStore } from "@/stores/user.store";
import UpdateUserProfileForm from "@/app/(dashboard)/dashboard/profile/components/update-user-form";
import SecuritySettings from "@/app/(dashboard)/dashboard/profile/components/security-settings";
import { formatKES } from "@/lib/format-kes";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const tenantStatusColor: Record<string, string> = {
  active: "green",
  notice_period: "orange",
  vacated: "red",
};

const tenantStatusLabel: Record<string, string> = {
  active: "Active",
  notice_period: "Notice Period",
  vacated: "Vacated",
};

const depositStatusColor: Record<string, string> = {
  pending: "orange",
  collected: "green",
  partially_refunded: "blue",
  fully_refunded: "cyan",
};

const depositStatusLabel: Record<string, string> = {
  pending: "Pending",
  collected: "Collected",
  partially_refunded: "Partially Refunded",
  fully_refunded: "Fully Refunded",
};

export default function TenantProfilePage() {
  const user = useUserStore((state) => state.user);
  const tenant = user?.tenant;
  const unit = tenant?.unit;
  const property = unit?.property;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Profile Header */}
      <Card style={{ marginBottom: isMobile ? 12 : 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 12 : 24,
            flexDirection: isMobile ? "column" : "row",
            textAlign: isMobile ? "center" : "left",
          }}
        >
          <Avatar
            size={isMobile ? 64 : 96}
            icon={<UserOutlined />}
            src={user?.avatarUrl}
            style={{ backgroundColor: "#1677ff", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              {user?.firstName} {user?.lastName}
            </Title>
            <Text
              type="secondary"
              style={{ fontSize: isMobile ? 13 : 15, display: "block", marginTop: 4 }}
            >
              Tenant
            </Text>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: isMobile ? 8 : 16,
                justifyContent: isMobile ? "center" : "flex-start",
              }}
            >
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
            <div style={{
              marginTop: 8,
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: isMobile ? "center" : "flex-start",
            }}>
              <Tag
                color={user?.status === "active" ? "green" : "red"}
              >
                {user?.status === "active"
                  ? "Active"
                  : user?.status || "Unknown"}
              </Tag>
              {user?.emailVerified && (
                <Tag icon={<SafetyCertificateOutlined />} color="blue">
                  Email Verified
                </Tag>
              )}
              {user?.phoneVerified && (
                <Tag icon={<SafetyCertificateOutlined />} color="blue">
                  Phone Verified
                </Tag>
              )}
              {tenant?.status && (
                <Tag color={tenantStatusColor[tenant.status] || "default"}>
                  {tenantStatusLabel[tenant.status] || tenant.status}
                </Tag>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tenant Details */}
      <Card
        title={
          <span>
            <HomeOutlined style={{ marginRight: 8 }} />
            Tenant Details
          </span>
        }
        style={{ marginBottom: isMobile ? 12 : 24 }}
      >
        <Descriptions
          column={isMobile ? 1 : { xs: 1, sm: 2 }}
          colon
          labelStyle={{ fontWeight: 600, color: "#434343" }}
          contentStyle={{ fontWeight: 400, color: "#595959" }}
          size={isMobile ? "small" : "default"}
        >
          <Descriptions.Item label="Unit Number">
            {unit?.unitNumber || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Property">
            {property?.name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Rent Amount">
            {unit?.rentAmount != null ? formatKES(Number(unit.rentAmount)) : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Wallet Balance">
            <Text
              strong
              style={{
                color:
                  tenant?.walletBalance != null && tenant.walletBalance > 0
                    ? "#52c41a"
                    : undefined,
              }}
            >
              <WalletOutlined style={{ marginRight: 4 }} />
              {tenant?.walletBalance != null
                ? formatKES(Number(tenant.walletBalance))
                : "-"}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Lease Start">
            {tenant?.leaseStart
              ? dayjs(tenant.leaseStart).format("DD MMMM YYYY")
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Lease End">
            {tenant?.leaseEnd
              ? dayjs(tenant.leaseEnd).format("DD MMMM YYYY")
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Deposit Amount">
            {tenant?.depositAmount != null
              ? formatKES(Number(tenant.depositAmount))
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Deposit Status">
            {tenant?.depositStatus ? (
              <Tag
                color={
                  depositStatusColor[tenant.depositStatus] || "default"
                }
              >
                {depositStatusLabel[tenant.depositStatus] ||
                  tenant.depositStatus}
              </Tag>
            ) : (
              "-"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Member Since">
            {user?.createdAt
              ? dayjs(user.createdAt).format("DD MMMM YYYY")
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Last Login">
            {user?.lastLoginAt
              ? dayjs(user.lastLoginAt).format("DD MMM YYYY, HH:mm")
              : "Never"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={isMobile ? [0, 12] : 24}>
        {/* Edit Profile */}
        <Col xs={24} lg={14} style={{ marginBottom: isMobile ? 12 : 24 }}>
          <Card
            title={
              <span>
                <EditOutlined style={{ marginRight: 8 }} />
                Edit Profile
              </span>
            }
            style={{ height: "100%" }}
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
            style={{ height: "100%" }}
          >
            <SecuritySettings />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
