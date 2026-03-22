"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useUserStore } from "@/stores/user.store";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
  MenuOutlined,
  CloseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Avatar, Button, Typography, Drawer, Grid } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type PropsWithChildren } from "react";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const menuItems = [
  { key: "/dashboard", icon: <DashboardOutlined />, label: <Link href="/dashboard">Dashboard</Link>, shortLabel: "Home" },
  { key: "/dashboard/properties", icon: <HomeOutlined />, label: <Link href="/dashboard/properties">Properties</Link>, shortLabel: "Properties" },
  { key: "/dashboard/tenants", icon: <TeamOutlined />, label: <Link href="/dashboard/tenants">Tenants</Link>, shortLabel: "Tenants" },
  { key: "/dashboard/invoices", icon: <FileTextOutlined />, label: <Link href="/dashboard/invoices">Invoices</Link>, shortLabel: "Invoices" },
  { key: "/dashboard/payments", icon: <DollarOutlined />, label: <Link href="/dashboard/payments">Payments</Link>, shortLabel: "Payments" },
  { key: "/dashboard/wallet", icon: <WalletOutlined />, label: <Link href="/dashboard/wallet">Wallet Ledger</Link>, shortLabel: "Wallet" },
  { key: "/dashboard/expenses", icon: <ToolOutlined />, label: <Link href="/dashboard/expenses">Expenses</Link>, shortLabel: "Expenses" },
  { key: "/dashboard/maintenance", icon: <AlertOutlined />, label: <Link href="/dashboard/maintenance">Maintenance</Link>, shortLabel: "Maint." },
  { key: "/dashboard/communications", icon: <MailOutlined />, label: <Link href="/dashboard/communications">Communications</Link>, shortLabel: "Comms" },
  { key: "/dashboard/settings", icon: <SettingOutlined />, label: <Link href="/dashboard/settings">Settings</Link>, shortLabel: "Settings" },
  { key: "/dashboard/profile", icon: <UserOutlined />, label: <Link href="/dashboard/profile">Profile</Link>, shortLabel: "Profile" },
];

const bottomTabItems = [
  { key: "/dashboard", icon: <DashboardOutlined />, label: "Home" },
  { key: "/dashboard/invoices", icon: <FileTextOutlined />, label: "Invoices" },
  { key: "/dashboard/tenants", icon: <TeamOutlined />, label: "Tenants" },
  { key: "/dashboard/payments", icon: <DollarOutlined />, label: "Payments" },
  { key: "/dashboard/properties", icon: <HomeOutlined />, label: "Properties" },
];

export default function DashboardLayout({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();
  const user = useUserStore((state) => state.user);
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const handleLogout = async () => {
    await logout();
  };

  const selectedKey = menuItems.find(
    (item) => pathname === item.key || (item.key !== "/dashboard" && pathname.startsWith(item.key))
  )?.key || "/dashboard";

  // Mobile layout
  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        {/* Mobile top header */}
        <Header style={{
          background: '#001529',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <Text strong style={{ fontSize: 17, color: '#fff' }}>RentFlow</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="text"
              icon={drawerOpen ? <CloseOutlined /> : <MenuOutlined />}
              onClick={() => setDrawerOpen(!drawerOpen)}
              size="small"
              aria-label="Menu"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            />
          </div>
        </Header>

        {/* Mobile drawer for full menu */}
        <Drawer
          placement="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={280}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#001529' }} />
              <div style={{ overflow: 'hidden' }}>
                <Text strong ellipsis style={{ display: 'block', fontSize: 14 }}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text type="secondary" ellipsis style={{ display: 'block', fontSize: 12 }}>
                  {user?.email}
                </Text>
              </div>
            </div>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
              onClick: () => setDrawerOpen(false),
            }))}
            style={{ border: 0 }}
          />
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              block
              style={{ textAlign: 'left' }}
            >
              Logout
            </Button>
          </div>
        </Drawer>

        {/* Mobile content */}
        <Content id="main-content" style={{ padding: '12px 12px 80px 12px', minHeight: 280 }}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Content>

        {/* Bottom tab bar */}
        <nav
          role="navigation"
          aria-label="Main navigation"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#001529',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            height: 64,
            zIndex: 100,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {bottomTabItems.map((item) => {
            const isActive = selectedKey === item.key;
            return (
              <Link
                key={item.key}
                href={item.key}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  height: '100%',
                  minWidth: 44,
                  minHeight: 44,
                  color: isActive ? '#1677ff' : 'rgba(255,255,255,0.55)',
                  textDecoration: 'none',
                  fontSize: 20,
                  gap: 2,
                  transition: 'color 0.2s',
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </Layout>
    );
  }

  // Desktop layout
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{
            height: 64,
            minHeight: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: collapsed ? '0 8px' : '0 16px',
            gap: collapsed ? 0 : 8,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            {!collapsed && (
              <Text strong style={{ color: '#fff', fontSize: 20, flex: 1 }}>RentFlow</Text>
            )}
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: 16,
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              style={{ borderRight: 0 }}
            />
          </div>
          <div style={{
            padding: collapsed ? '8px 4px' : '8px 12px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Avatar
              size="small"
              icon={<UserOutlined />}
              style={{ flexShrink: 0, cursor: 'pointer' }}
              onClick={() => collapsed && setCollapsed(false)}
            />
            {!collapsed && (
              <>
                <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                  <Text ellipsis style={{ color: '#fff', fontSize: 12, display: 'block', lineHeight: '18px' }}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                  <Text ellipsis style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, display: 'block', lineHeight: '14px' }}>
                    {user?.email}
                  </Text>
                </div>
                <Button
                  type="text"
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  size="small"
                  style={{ color: 'rgba(255,255,255,0.65)', flexShrink: 0 }}
                />
              </>
            )}
          </div>
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
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>RentFlow Dashboard</h1>
        </Header>
        <Content id="main-content" style={{ margin: 24, minHeight: 280 }}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
}
