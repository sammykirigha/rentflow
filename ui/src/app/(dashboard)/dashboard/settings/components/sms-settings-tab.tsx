'use client';

import {
  getCurrentOrgCredentials,
  updateCurrentOrganization,
} from '@/lib/api/organizations.api';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input, message, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

export default function SmsSettingsTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [credentialInfo, setCredentialInfo] = useState<{
    username: string | null;
    senderId: string | null;
    apiKeyMask: string | null;
  } | null>(null);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const data = await getCurrentOrgCredentials();
      if (data?.sms) {
        setIsConfigured(data.sms.isConfigured);
        setCredentialInfo(data.sms);
        form.setFieldsValue({
          atUsername: data.sms.username || '',
          atSenderId: data.sms.senderId || '',
        });
      }
    } catch {
      message.error('Failed to load SMS credential status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload: Record<string, string> = {};
      if (values.atApiKey) payload.atApiKey = values.atApiKey;
      if (values.atUsername) payload.atUsername = values.atUsername;
      if (values.atSenderId) payload.atSenderId = values.atSenderId;

      await updateCurrentOrganization(payload);
      message.success('SMS settings saved');
      form.setFieldsValue({ atApiKey: '' });
      fetchCredentials();
    } catch {
      message.error('Failed to save SMS settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>SMS (Africa&apos;s Talking) Configuration</Title>
        <Space style={{ marginTop: 8 }}>
          {isConfigured ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Configured</Tag>
          ) : (
            <Tag icon={<CloseCircleOutlined />} color="error">Not Configured</Tag>
          )}
          {credentialInfo?.apiKeyMask && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Key: {credentialInfo.apiKeyMask}
            </Text>
          )}
        </Space>
      </div>

      <Form form={form} layout="vertical" style={{ maxWidth: 480 }}>
        <Form.Item name="atApiKey" label="API Key">
          <Input.Password
            placeholder={isConfigured ? 'Leave blank to keep current' : 'Enter API key'}
            visibilityToggle
          />
        </Form.Item>
        <Form.Item name="atUsername" label="Username">
          <Input placeholder="e.g. rentflow" />
        </Form.Item>
        <Form.Item name="atSenderId" label="Sender ID">
          <Input placeholder="e.g. RENTFLOW" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={handleSave} loading={saving}>
            Save SMS Settings
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
