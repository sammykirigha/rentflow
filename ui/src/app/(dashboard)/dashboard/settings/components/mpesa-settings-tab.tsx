'use client';

import {
  getCurrentOrgCredentials,
  registerMpesaC2bUrls,
  updateCurrentOrganization,
} from '@/lib/api/organizations.api';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Badge, Button, Form, Input, message, Select, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

export default function MpesaSettingsTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [credentialInfo, setCredentialInfo] = useState<{
    shortcode: string | null;
    environment: string;
    consumerKeyMask: string | null;
  } | null>(null);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const data = await getCurrentOrgCredentials();
      if (data?.mpesa) {
        setIsConfigured(data.mpesa.isConfigured);
        setCredentialInfo(data.mpesa);
        // Pre-fill non-secret fields
        form.setFieldsValue({
          mpesaShortcode: data.mpesa.shortcode || '',
          mpesaEnvironment: data.mpesa.environment || 'sandbox',
        });
      }
    } catch {
      message.error('Failed to load M-Pesa credential status');
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

      // Only send non-empty password fields
      const payload: Record<string, string> = {};
      if (values.mpesaConsumerKey) payload.mpesaConsumerKey = values.mpesaConsumerKey;
      if (values.mpesaConsumerSecret) payload.mpesaConsumerSecret = values.mpesaConsumerSecret;
      if (values.mpesaPasskey) payload.mpesaPasskey = values.mpesaPasskey;
      if (values.mpesaShortcode) payload.mpesaShortcode = values.mpesaShortcode;
      if (values.mpesaEnvironment) payload.mpesaEnvironment = values.mpesaEnvironment;

      await updateCurrentOrganization(payload);
      message.success('M-Pesa settings saved');
      form.setFieldsValue({
        mpesaConsumerKey: '',
        mpesaConsumerSecret: '',
        mpesaPasskey: '',
      });
      fetchCredentials();

      // Auto-register C2B callback URLs with Safaricom when credentials have a shortcode
      if (payload.mpesaShortcode || credentialInfo?.shortcode) {
        try {
          await registerMpesaC2bUrls();
          message.success('C2B callback URLs registered with Safaricom');
        } catch {
          message.warning(
            'Settings saved but C2B URL registration failed. You can retry from the M-Pesa settings.',
          );
        }
      }
    } catch {
      message.error('Failed to save M-Pesa settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>M-Pesa (Daraja) Configuration</Title>
        <Space style={{ marginTop: 8 }}>
          {isConfigured ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Configured</Tag>
          ) : (
            <Tag icon={<CloseCircleOutlined />} color="error">Not Configured</Tag>
          )}
          {credentialInfo?.consumerKeyMask && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Key: {credentialInfo.consumerKeyMask}
            </Text>
          )}
        </Space>
      </div>

      <Form form={form} layout="vertical" style={{ maxWidth: 480 }}>
        <Form.Item name="mpesaConsumerKey" label="Consumer Key">
          <Input.Password
            placeholder={isConfigured ? 'Leave blank to keep current' : 'Enter consumer key'}
            visibilityToggle
          />
        </Form.Item>
        <Form.Item name="mpesaConsumerSecret" label="Consumer Secret">
          <Input.Password
            placeholder={isConfigured ? 'Leave blank to keep current' : 'Enter consumer secret'}
            visibilityToggle
          />
        </Form.Item>
        <Form.Item name="mpesaPasskey" label="Passkey">
          <Input.Password
            placeholder={isConfigured ? 'Leave blank to keep current' : 'Enter passkey'}
            visibilityToggle
          />
        </Form.Item>
        <Form.Item name="mpesaShortcode" label="Paybill / Shortcode">
          <Input placeholder="e.g. 123456" />
        </Form.Item>
        <Form.Item name="mpesaEnvironment" label="Environment">
          <Select
            options={[
              { value: 'sandbox', label: 'Sandbox' },
              { value: 'production', label: 'Production' },
            ]}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" onClick={handleSave} loading={saving}>
              Save M-Pesa Settings
            </Button>
            {isConfigured && (
              <Button
                loading={registering}
                onClick={async () => {
                  try {
                    setRegistering(true);
                    await registerMpesaC2bUrls();
                    message.success('C2B callback URLs registered with Safaricom');
                  } catch {
                    message.error('C2B URL registration failed. Check your credentials and try again.');
                  } finally {
                    setRegistering(false);
                  }
                }}
              >
                Register C2B URLs
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
