'use client';

import api from '@/lib/api';
import { resendInvitation, updatePlatformOrganization, updatePlatformOrganizationOwner } from '@/lib/api/platform.api';
import { ArrowLeftOutlined, EditOutlined, MailOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const { Title } = Typography;

interface OrgDetail {
  organization: {
    organizationId: string;
    name: string;
    slug: string;
    status: string;
    ownerUserId: string;
    supportEmail?: string;
    supportPhone?: string;
    mpesaShortcode?: string;
    mpesaEnvironment?: string;
    createdAt: string;
  };
  subscription: {
    subscriptionId: string;
    plan: string;
    status: string;
    maxProperties: number;
    maxUnits: number;
    smsQuotaMonthly: number;
    smsUsedThisPeriod: number;
    trialEndsAt?: string;
  } | null;
  owner: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  } | null;
}

export default function OrganizationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [form] = Form.useForm();

  const fetchDetail = async () => {
    try {
      const response = await api.get(`/platform/organizations/${id}`);
      setDetail(response.data?.data || response.data);
    } catch (error) {
      console.error('Failed to fetch org detail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.accessToken && id) {
      fetchDetail();
    }
  }, [session, id]);

  const handleSuspend = async () => {
    try {
      await api.patch(`/platform/organizations/${id}/suspend`);
      message.success('Organization suspended');
      fetchDetail();
    } catch {
      message.error('Failed to suspend organization');
    }
  };

  const handleActivate = async () => {
    try {
      await api.patch(`/platform/organizations/${id}/activate`);
      message.success('Organization activated');
      fetchDetail();
    } catch {
      message.error('Failed to activate organization');
    }
  };

  const handleImpersonate = async () => {
    try {
      const response = await api.post(`/platform/organizations/${id}/impersonate`);
      const token = response.data?.data?.accessToken || response.data?.accessToken;
      if (token) {
        message.success('Impersonation token generated. Use it in a new browser session.');
        navigator.clipboard.writeText(token);
        message.info('Token copied to clipboard');
      }
    } catch {
      message.error('Failed to create impersonation token');
    }
  };

  const openEditModal = () => {
    if (detail) {
      form.setFieldsValue({
        name: detail.organization.name,
        supportEmail: detail.organization.supportEmail || '',
        supportPhone: detail.organization.supportPhone || '',
        mpesaShortcode: detail.organization.mpesaShortcode || '',
        mpesaEnvironment: detail.organization.mpesaEnvironment || '',
        ownerFirstName: detail.owner?.firstName || '',
        ownerLastName: detail.owner?.lastName || '',
        ownerEmail: detail.owner?.email || '',
        ownerPhone: detail.owner?.phone || '',
      });
      setEditModalOpen(true);
    }
  };

  const handleEditSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        updatePlatformOrganization(id as string, {
          name: values.name,
          supportEmail: values.supportEmail || null,
          supportPhone: values.supportPhone || null,
          mpesaShortcode: values.mpesaShortcode || null,
          mpesaEnvironment: values.mpesaEnvironment || null,
        }),
        updatePlatformOrganizationOwner(id as string, {
          firstName: values.ownerFirstName,
          lastName: values.ownerLastName,
          email: values.ownerEmail,
          phone: values.ownerPhone || undefined,
        }),
      ]);
      message.success('Organization updated');
    } catch {
      message.error('Failed to update organization');
    }
    setSaving(false);
    setEditModalOpen(false);
    fetchDetail();
  };

  const handleResendInvitation = async () => {
    try {
      setResending(true);
      const result = await resendInvitation(id as string);
      message.success(`Invitation resent to ${result?.email || 'the owner'}`);
    } catch {
      message.error('Failed to resend invitation');
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!detail) {
    return <div style={{ padding: 24 }}>Organization not found</div>;
  }

  const { organization: org, subscription: sub, owner } = detail;
  const statusColor: Record<string, string> = {
    active: 'green',
    trial: 'blue',
    suspended: 'red',
    cancelled: 'default',
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Space align="center">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push('/platform/organizations')}
              style={{ fontSize: 18 }}
            />
            <Title level={2} style={{ margin: 0 }}>{org.name}</Title>
          </Space>
          <Space wrap>
            <Popconfirm
              title="Resend invitation?"
              description="This will reset the owner's password and send a new welcome email."
              onConfirm={handleResendInvitation}
              okText="Yes, resend"
              cancelText="Cancel"
            >
              <Button icon={<MailOutlined />} loading={resending}>
                Resend Invitation
              </Button>
            </Popconfirm>
            {org.status !== 'suspended' && (
              <Button danger onClick={handleSuspend}>Suspend</Button>
            )}
            {org.status === 'suspended' && (
              <Button type="primary" onClick={handleActivate}>Activate</Button>
            )}
            <Button onClick={handleImpersonate}>Impersonate</Button>
          </Space>
        </div>

        <Card
          title="Organization Details"
          extra={
            <Button type="link" icon={<EditOutlined />} onClick={openEditModal}>
              Edit
            </Button>
          }
        >
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Name">{org.name}</Descriptions.Item>
            <Descriptions.Item label="Slug">{org.slug}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColor[org.status] || 'default'}>{org.status.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Owner">
              {owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || '—' : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Owner Email">{owner?.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Owner Phone">{owner?.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Support Email">{org.supportEmail || '—'}</Descriptions.Item>
            <Descriptions.Item label="Support Phone">{org.supportPhone || '—'}</Descriptions.Item>
            <Descriptions.Item label="M-Pesa Shortcode">{org.mpesaShortcode || '—'}</Descriptions.Item>
            <Descriptions.Item label="M-Pesa Environment">{org.mpesaEnvironment || '—'}</Descriptions.Item>
            <Descriptions.Item label="Created">{new Date(org.createdAt).toLocaleDateString()}</Descriptions.Item>
          </Descriptions>
        </Card>

        {sub && (
          <Card title="Subscription">
            <Descriptions column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Plan">
                <Tag color="blue">{sub.plan.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColor[sub.status] || 'default'}>{sub.status.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Max Properties">{sub.maxProperties === -1 ? 'Unlimited' : sub.maxProperties}</Descriptions.Item>
              <Descriptions.Item label="Max Units">{sub.maxUnits === -1 ? 'Unlimited' : sub.maxUnits}</Descriptions.Item>
              <Descriptions.Item label="SMS Quota">{sub.smsQuotaMonthly === -1 ? 'Unlimited' : `${sub.smsUsedThisPeriod} / ${sub.smsQuotaMonthly}`}</Descriptions.Item>
              {sub.trialEndsAt && (
                <Descriptions.Item label="Trial Ends">{new Date(sub.trialEndsAt).toLocaleDateString()}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}
      </Space>

      <Modal
        title="Edit Organization"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditModalOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleEditSave}>Save</Button>,
        ]}
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Organization</div>
          <Form.Item
            label="Name"
            name="name"
            rules={[
              { required: true, message: 'Name is required' },
              { max: 100, message: 'Name must be 100 characters or less' },
            ]}
          >
            <Input />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              label="Support Email"
              name="supportEmail"
              rules={[{ type: 'email', message: 'Enter a valid email' }]}
            >
              <Input placeholder="support@example.com" />
            </Form.Item>
            <Form.Item label="Support Phone" name="supportPhone">
              <Input placeholder="+254 712 345 678" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="M-Pesa Shortcode" name="mpesaShortcode">
              <Input placeholder="174379" />
            </Form.Item>
            <Form.Item label="M-Pesa Environment" name="mpesaEnvironment">
              <Select
                allowClear
                placeholder="Select environment"
                options={[
                  { value: 'sandbox', label: 'Sandbox' },
                  { value: 'production', label: 'Production' },
                ]}
              />
            </Form.Item>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Owner</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              label="First Name"
              name="ownerFirstName"
              rules={[{ required: true, message: 'First name is required' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Last Name"
              name="ownerLastName"
              rules={[{ required: true, message: 'Last name is required' }]}
            >
              <Input />
            </Form.Item>
          </div>
          <Form.Item
            label="Email"
            name="ownerEmail"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Phone" name="ownerPhone">
            <Input placeholder="0712345678" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
