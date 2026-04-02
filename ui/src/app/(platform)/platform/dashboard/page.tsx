'use client';

import { useSession } from 'next-auth/react';
import { Card, Col, Row, Statistic, Typography, Table, Tag, List, Grid, Skeleton, Button } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  DollarOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatKES } from '@/lib/format-kes';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  suspendedOrganizations: number;
  mrr: number;
  orgGrowth: Array<{ month: string; count: number }>;
  trialExpiring: Array<{
    organizationId: string;
    orgName: string;
    ownerEmail: string;
    trialEndsAt: string;
    daysRemaining: number;
  }>;
  planDistribution: Array<{ plan: string; count: number }>;
  recentActivity: Array<{
    auditId: string;
    action: string;
    targetType: string;
    details: string;
    createdAt: string;
    performerName: string;
  }>;
  smsThisMonth: number;
}

export default function PlatformDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [activityLimit, setActivityLimit] = useState(10);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/platform/dashboard');
        setStats(response.data?.data || response.data);
      } catch (error) {
        console.error('Failed to fetch platform stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.accessToken) {
      fetchStats();
    }
  }, [session]);

  const planColors: Record<string, string> = {
    basic: 'blue',
    pro: 'green',
    enterprise: 'purple',
  };

  const trialExpiring = stats?.trialExpiring ?? [];
  const allActivity = stats?.recentActivity ?? [];
  const visibleActivity = isMobile ? allActivity.slice(0, activityLimit) : allActivity.slice(0, 15);

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Title level={isMobile ? 4 : 2}>Platform Dashboard</Title>

      {/* Row 1: Key metrics */}
      <Row gutter={isMobile ? [8, 8] : [16, 16]}>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={loading} size={isMobile ? 'small' : 'default'}>
            <Statistic
              title={<Text style={{ fontSize: isMobile ? 11 : 14 }}>Total Orgs</Text>}
              value={stats?.totalOrganizations || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ fontSize: isMobile ? 20 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={loading} size={isMobile ? 'small' : 'default'}>
            <Statistic
              title={<Text style={{ fontSize: isMobile ? 11 : 14 }}>MRR</Text>}
              value={stats?.mrr || 0}
              prefix={<DollarOutlined />}
              formatter={(value) => formatKES(Number(value))}
              valueStyle={{ color: '#3f8600', fontSize: isMobile ? 16 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={loading} size={isMobile ? 'small' : 'default'}>
            <Statistic
              title={<Text style={{ fontSize: isMobile ? 11 : 14 }}>Active Trials</Text>}
              value={stats?.trialOrganizations || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: isMobile ? 20 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card loading={loading} size={isMobile ? 'small' : 'default'}>
            <Statistic
              title={<Text style={{ fontSize: isMobile ? 11 : 14 }}>SMS This Month</Text>}
              value={stats?.smsThisMonth || 0}
              prefix={<MessageOutlined />}
              valueStyle={{ fontSize: isMobile ? 20 : 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Row 2: Plan distribution + Org status */}
      <Row gutter={isMobile ? [8, 8] : [16, 16]} style={{ marginTop: isMobile ? 8 : 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Plan Distribution</Text>}
            loading={loading}
            size={isMobile ? 'small' : 'default'}
          >
            {stats?.planDistribution?.length ? (
              <div style={{ display: 'flex', gap: isMobile ? 12 : 16, flexWrap: 'wrap' }}>
                {stats.planDistribution.map((p) => (
                  <div key={p.plan} style={{ textAlign: 'center', minWidth: isMobile ? 60 : 80 }}>
                    <Tag color={planColors[p.plan] || 'default'} style={{ fontSize: isMobile ? 12 : 14, padding: isMobile ? '2px 8px' : '4px 12px' }}>
                      {p.plan.toUpperCase()}
                    </Tag>
                    <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 600, marginTop: 8 }}>{p.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">No subscriptions yet</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Organization Status</Text>}
            loading={loading}
            size={isMobile ? 'small' : 'default'}
          >
            <Row gutter={[8, 8]}>
              <Col span={8}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Active</Text>}
                  value={stats?.activeOrganizations || 0}
                  valueStyle={{ color: '#3f8600', fontSize: isMobile ? 18 : 20 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Trial</Text>}
                  value={stats?.trialOrganizations || 0}
                  valueStyle={{ color: '#1890ff', fontSize: isMobile ? 18 : 20 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>Suspended</Text>}
                  value={stats?.suspendedOrganizations || 0}
                  valueStyle={{ color: '#cf1322', fontSize: isMobile ? 18 : 20 }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Trials Expiring Soon */}
      {trialExpiring.length > 0 && (
        <Row gutter={isMobile ? [8, 8] : [16, 16]} style={{ marginTop: isMobile ? 8 : 16 }}>
          <Col xs={24}>
            <Card
              title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Trials Expiring Soon</Text>}
              size={isMobile ? 'small' : 'default'}
            >
              {isMobile ? (
                <div>
                  {trialExpiring.map((trial) => (
                    <div
                      key={trial.organizationId}
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid #f5f5f5',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                            {trial.orgName}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis>
                            {trial.ownerEmail}
                          </Text>
                        </div>
                        <Tag
                          color={trial.daysRemaining <= 2 ? 'red' : trial.daysRemaining <= 5 ? 'orange' : 'blue'}
                          style={{ margin: 0, fontSize: 11 }}
                        >
                          {trial.daysRemaining}d left
                        </Tag>
                      </div>
                      <Text type="secondary" style={{ fontSize: 10, marginTop: 4, display: 'block' }}>
                        Ends: {trial.trialEndsAt ? dayjs(trial.trialEndsAt).format('DD MMM YYYY') : '-'}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Table
                  dataSource={trialExpiring}
                  rowKey="organizationId"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Organization', dataIndex: 'orgName', key: 'orgName', ellipsis: true },
                    { title: 'Owner Email', dataIndex: 'ownerEmail', key: 'ownerEmail', ellipsis: true },
                    {
                      title: 'Trial Ends',
                      dataIndex: 'trialEndsAt',
                      key: 'trialEndsAt',
                      render: (v: string) => v ? dayjs(v).format('DD MMM YYYY') : '-',
                    },
                    {
                      title: 'Days Left',
                      dataIndex: 'daysRemaining',
                      key: 'daysRemaining',
                      width: 100,
                      render: (v: number) => (
                        <Tag color={v <= 2 ? 'red' : v <= 5 ? 'orange' : 'blue'}>
                          {v} day{v !== 1 ? 's' : ''}
                        </Tag>
                      ),
                    },
                  ]}
                />
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Row 4: Recent Activity */}
      <Row gutter={isMobile ? [8, 8] : [16, 16]} style={{ marginTop: isMobile ? 8 : 16 }}>
        <Col xs={24}>
          <Card
            title={<Text strong style={{ fontSize: isMobile ? 14 : 16 }}>Recent Activity</Text>}
            loading={loading}
            size={isMobile ? 'small' : 'default'}
          >
            {allActivity.length > 0 ? (
              isMobile ? (
                <div>
                  {visibleActivity.map((item) => (
                    <div
                      key={item.auditId}
                      style={{
                        padding: '8px 0',
                        borderBottom: '1px solid #f5f5f5',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong style={{ fontSize: 12 }}>{item.performerName}</Text>
                          {' '}
                          <Tag style={{ fontSize: 10 }}>{item.action.replace(/_/g, ' ')}</Tag>
                        </div>
                        <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap', marginLeft: 6 }}>
                          {dayjs(item.createdAt).format('DD MMM HH:mm')}
                        </Text>
                      </div>
                      {item.details && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }} ellipsis>
                          {item.details.slice(0, 80)}{item.details.length > 80 ? '...' : ''}
                        </Text>
                      )}
                    </div>
                  ))}
                  {allActivity.length > activityLimit && (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <Button size="small" onClick={() => setActivityLimit(activityLimit + 10)}>
                        Load More ({allActivity.length - activityLimit} remaining)
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <List
                  size="small"
                  dataSource={visibleActivity}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <span>
                            <Text strong style={{ fontSize: 13 }}>{item.performerName}</Text>
                            {' '}
                            <Tag style={{ fontSize: 11 }}>{item.action.replace(/_/g, ' ')}</Tag>
                          </span>
                        }
                        description={
                          <span style={{ fontSize: 12 }}>
                            {item.details?.slice(0, 120)}{item.details?.length > 120 ? '...' : ''}
                          </span>
                        }
                      />
                      <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                        {dayjs(item.createdAt).format('DD MMM HH:mm')}
                      </Text>
                    </List.Item>
                  )}
                />
              )
            ) : (
              <Text type="secondary">No activity yet</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
