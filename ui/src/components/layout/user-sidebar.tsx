"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useUserStore } from "@/stores/user.store";
import {
  DashboardOutlined,
  HomeOutlined,
  TeamOutlined,
  FileTextOutlined,
  DollarOutlined,
  WalletOutlined,
  ToolOutlined,
  AlertOutlined,
  MailOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Avatar, Button, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const { Sider } = Layout;
const { Text } = Typography;

const menuItems = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: <Link href="/dashboard">Dashboard</Link>,
  },
  {
    key: "/dashboard/properties",
    icon: <HomeOutlined />,
    label: <Link href="/dashboard/properties">Properties</Link>,
  },
  {
    key: "/dashboard/tenants",
    icon: <TeamOutlined />,
    label: <Link href="/dashboard/tenants">Tenants</Link>,
  },
  {
    key: "/dashboard/invoices",
    icon: <FileTextOutlined />,
    label: <Link href="/dashboard/invoices">Invoices</Link>,
  },
  {
    key: "/dashboard/payments",
    icon: <DollarOutlined />,
    label: <Link href="/dashboard/payments">Payments</Link>,
  },
  {
    key: "/dashboard/wallet",
    icon: <WalletOutlined />,
    label: <Link href="/dashboard/wallet">Wallet Ledger</Link>,
  },
  {
    key: "/dashboard/expenses",
    icon: <ToolOutlined />,
    label: <Link href="/dashboard/expenses">Expenses</Link>,
  },
  {
    key: "/dashboard/maintenance",
    icon: <AlertOutlined />,
    label: <Link href="/dashboard/maintenance">Maintenance</Link>,
  },
  {
    key: "/dashboard/communications",
    icon: <MailOutlined />,
    label: <Link href="/dashboard/communications">Communications</Link>,
  },
  {
    key: "/dashboard/settings",
    icon: <SettingOutlined />,
    label: <Link href="/dashboard/settings">Settings</Link>,
  },
  {
    key: "/dashboard/profile",
    icon: <UserOutlined />,
    label: <Link href="/dashboard/profile">Profile</Link>,
  },
];

export default function UserSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();
  const user = useUserStore((state) => state.user);

  const handleLogout = async () => {
    await logout();
  };

  const selectedKey = menuItems.find(
    (item) => pathname === item.key || (item.key !== "/dashboard" && pathname.startsWith(item.key))
  )?.key || "/dashboard";

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      breakpoint="lg"
      style={{
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
        {/* Logo */}
        <div style={{
          height: 64,
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Text strong style={{ color: '#fff', fontSize: collapsed ? 14 : 20 }}>
            {collapsed ? 'RF' : 'RentFlow'}
          </Text>
        </div>

        {/* Scrollable menu */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            style={{ borderRight: 0 }}
          />
        </div>

        {/* User info + logout — pinned to bottom */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Avatar size="small" icon={<UserOutlined />} />
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <Text ellipsis style={{ color: '#fff', fontSize: 13, display: 'block' }}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text ellipsis style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block' }}>
                  {user?.email}
                </Text>
              </div>
            )}
          </div>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            block
            style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'left' }}
          >
            {!collapsed && 'Logout'}
          </Button>
        </div>
      </div>
    </Sider>
  );
}
