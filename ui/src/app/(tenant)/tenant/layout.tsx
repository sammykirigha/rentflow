"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useUserStore } from "@/stores/user.store";
import { useSession } from "next-auth/react";
import { communicationsApi } from "@/lib/api/communications.api";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  FileTextOutlined,
  DollarOutlined,
  ToolOutlined,
  FileProtectOutlined,
  BarChartOutlined,
  WalletOutlined,
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  MenuOutlined,
  CloseOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Avatar, Button, Typography, Drawer, Grid, Badge } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const menuItems = [
  {
    key: "/tenant/dashboard",
    icon: <HomeOutlined />,
    label: <Link href="/tenant/dashboard">Dashboard</Link>,
    shortLabel: "Home",
  },
  {
    key: "/tenant/invoices",
    icon: <FileTextOutlined />,
    label: <Link href="/tenant/invoices">My Invoices</Link>,
    shortLabel: "Invoices",
  },
  {
    key: "/tenant/payments",
    icon: <DollarOutlined />,
    label: <Link href="/tenant/payments">My Payments</Link>,
    shortLabel: "Payments",
  },
  {
    key: "/tenant/maintenance",
    icon: <ToolOutlined />,
    label: <Link href="/tenant/maintenance">Maintenance</Link>,
    shortLabel: "Repairs",
  },
  {
    key: "/tenant/wallet",
    icon: <WalletOutlined />,
    label: <Link href="/tenant/wallet">My Wallet</Link>,
    shortLabel: "Wallet",
  },
  {
    key: "/tenant/receipts",
    icon: <FileProtectOutlined />,
    label: <Link href="/tenant/receipts">My Receipts</Link>,
    shortLabel: "Receipts",
  },
  {
    key: "/tenant/statements",
    icon: <BarChartOutlined />,
    label: <Link href="/tenant/statements">Statements</Link>,
    shortLabel: "Statements",
  },
  {
    key: "/tenant/notifications",
    icon: <BellOutlined />,
    label: <Link href="/tenant/notifications">Notifications</Link>,
    shortLabel: "Alerts",
  },
  {
    key: "/tenant/profile",
    icon: <UserOutlined />,
    label: <Link href="/tenant/profile">My Profile</Link>,
    shortLabel: "Profile",
  },
];

const bottomTabItems = [
  { key: "/tenant/dashboard", icon: <HomeOutlined />, label: "Home" },
  { key: "/tenant/invoices", icon: <FileTextOutlined />, label: "Invoices" },
  { key: "/tenant/wallet", icon: <WalletOutlined />, label: "Wallet" },
  { key: "/tenant/payments", icon: <DollarOutlined />, label: "Payments" },
  { key: "/tenant/maintenance", icon: <ToolOutlined />, label: "Repairs" },
];

export default function TenantInnerLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const { logout } = useAuth();
  const { data: session } = useSession();
  const user = useUserStore((state) => state.user);
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const mustChangePassword = (session?.user as unknown as Record<string, unknown>)?.mustChangePassword === true;

  const fetchUnreadCount = useCallback(async () => {
    if (mustChangePassword) return; // Skip polling when password change is pending
    const count = await communicationsApi.getMyUnreadCount();
    setUnreadCount(count);
  }, [mustChangePassword]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // poll every minute
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Reset unread when visiting notifications page
  useEffect(() => {
    if (pathname === '/tenant/notifications') {
      setUnreadCount(0);
    }
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
  };

  const selectedKey = menuItems.find(
    (item) => pathname === item.key || pathname.startsWith(item.key + "/")
  )?.key || "/tenant/dashboard";

  // Mobile layout
  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        {/* Skip navigation link for accessibility */}
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
          onFocus={(e) => { e.currentTarget.style.position = 'static'; e.currentTarget.style.width = 'auto'; e.currentTarget.style.height = 'auto'; }}
          onBlur={(e) => { e.currentTarget.style.position = 'absolute'; e.currentTarget.style.left = '-9999px'; e.currentTarget.style.width = '1px'; e.currentTarget.style.height = '1px'; }}
        >
          Skip to main content
        </a>

        {/* Mobile top header */}
        <Header style={{
          background: '#fff',
          padding: '0 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <Text strong style={{ fontSize: 17 }}>RentFlow</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/tenant/notifications" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
              <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                <Button type="text" icon={<BellOutlined />} size="small" />
              </Badge>
            </Link>
            <Button
              type="text"
              icon={drawerOpen ? <CloseOutlined /> : <MenuOutlined />}
              onClick={() => setDrawerOpen(!drawerOpen)}
              size="small"
              aria-label="Menu"
            />
          </div>
        </Header>

        {/* Mobile drawer */}
        <Drawer
          placement="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={280}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
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
              icon: item.key === '/tenant/notifications'
                ? <Badge count={unreadCount} size="small" offset={[8, 0]}>{item.icon}</Badge>
                : item.icon,
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
            background: '#fff',
            borderTop: '1px solid #e8e8e8',
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
                  color: isActive ? '#1677ff' : '#8c8c8c',
                  textDecoration: 'none',
                  fontSize: 20,
                  gap: 2,
                  transition: 'color 0.2s',
                }}
              >
                <span style={{ fontSize: 22 }}>{item.icon}</span>
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
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.key === '/tenant/notifications'
              ? <Badge count={unreadCount} size="small" offset={[8, 0]}>{item.icon}</Badge>
              : item.icon,
            label: item.label,
          }))}
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
          justifyContent: 'space-between',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>RentFlow Tenant Portal</h1>
          <Link href="/tenant/notifications" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
            <Badge count={unreadCount} offset={[-2, 2]}>
              <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
            </Badge>
          </Link>
        </Header>
        <Content id="main-content" style={{ margin: 24, minHeight: 280 }}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
}
