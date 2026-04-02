"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useUserStore } from "@/stores/user.store";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  DashboardOutlined,
  TeamOutlined,
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
  { key: "/platform/dashboard", icon: <DashboardOutlined />, label: <Link href="/platform/dashboard">Dashboard</Link> },
  { key: "/platform/organizations", icon: <TeamOutlined />, label: <Link href="/platform/organizations">Organizations</Link> },
  { key: "/platform/config", icon: <SettingOutlined />, label: <Link href="/platform/config">Platform Config</Link> },
];

export default function PlatformLayoutShell({ children }: PropsWithChildren) {
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
    (item) => pathname === item.key || (item.key !== "/platform/dashboard" && pathname.startsWith(item.key))
  )?.key || "/platform/dashboard";

  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
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
          <Text strong style={{ fontSize: 17, color: '#fff' }}>RentFlow Admin</Text>
          <Button
            type="text"
            icon={drawerOpen ? <CloseOutlined /> : <MenuOutlined />}
            onClick={() => setDrawerOpen(!drawerOpen)}
            size="small"
            aria-label="Menu"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          />
        </Header>

        <Drawer
          placement="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={280}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#722ed1' }} />
              <div style={{ overflow: 'hidden' }}>
                <Text strong ellipsis style={{ display: 'block', fontSize: 14 }}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text type="secondary" ellipsis style={{ display: 'block', fontSize: 12 }}>
                  Super Admin
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

        <Content id="main-content" style={{ padding: '12px', minHeight: 280 }}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Content>
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
              <Text strong style={{ color: '#fff', fontSize: 18, flex: 1 }}>RentFlow Admin</Text>
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
              style={{ flexShrink: 0, backgroundColor: '#722ed1' }}
            />
            {!collapsed && (
              <>
                <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                  <Text ellipsis style={{ color: '#fff', fontSize: 12, display: 'block', lineHeight: '18px' }}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                  <Text ellipsis style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, display: 'block', lineHeight: '14px' }}>
                    Super Admin
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
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Platform Administration</h1>
        </Header>
        <Content id="main-content" style={{ margin: 24, minHeight: 280 }}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
}
