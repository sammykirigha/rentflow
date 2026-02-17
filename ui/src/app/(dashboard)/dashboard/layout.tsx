"use client";

import UserSidebar from "@/components/layout/user-sidebar";
import { Layout } from 'antd';
import { PropsWithChildren } from 'react';

const { Content, Header } = Layout;

export default function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <UserSidebar />
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
        <Content style={{ margin: 24, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
