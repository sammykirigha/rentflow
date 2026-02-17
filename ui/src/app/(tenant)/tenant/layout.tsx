"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useUserStore } from "@/stores/user.store";
import {
  FileTextOutlined,
  DollarOutlined,
  ToolOutlined,
  FileProtectOutlined,
  WalletOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Avatar, Button, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  {
    key: "/tenant/invoices",
    icon: <FileTextOutlined />,
    label: <Link href="/tenant/invoices">My Invoices</Link>,
  },
  {
    key: "/tenant/payments",
    icon: <DollarOutlined />,
    label: <Link href="/tenant/payments">My Payments</Link>,
  },
  {
    key: "/tenant/maintenance",
    icon: <ToolOutlined />,
    label: <Link href="/tenant/maintenance">Maintenance</Link>,
  },
  {
    key: "/tenant/wallet",
    icon: <WalletOutlined />,
    label: <Link href="/tenant/wallet">My Wallet</Link>,
  },
  {
    key: "/tenant/receipts",
    icon: <FileProtectOutlined />,
    label: <Link href="/tenant/receipts">My Receipts</Link>,
  },
];

export default function TenantInnerLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();
  const user = useUserStore((state) => state.user);

  const handleLogout = async () => {
    await logout();
  };

  const selectedKey = menuItems.find(
    (item) => pathname === item.key || pathname.startsWith(item.key + "/")
  )?.key || "/tenant/invoices";

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        theme="light"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Text strong style={{ fontSize: collapsed ? 14 : 18 }}>
            {collapsed ? 'RF' : 'RentFlow'}
          </Text>
        </div>

        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />

        <div style={{
          position: 'absolute',
          bottom: 48,
          width: '100%',
          padding: '12px 16px',
          borderTop: '1px solid #f0f0f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Avatar size="small" icon={<UserOutlined />} />
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <Text ellipsis style={{ fontSize: 13, display: 'block' }}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text ellipsis type="secondary" style={{ fontSize: 11, display: 'block' }}>
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
            style={{ textAlign: 'left' }}
          >
            {!collapsed && 'Logout'}
          </Button>
        </div>
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>RentFlow Tenant Portal</h1>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
