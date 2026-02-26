'use client';

import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { MailOutlined, PhoneOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, Spin, Typography, App } from 'antd';
import { useEffect } from 'react';

const { Text } = Typography;

export default function GeneralSettingsTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        contactPhone: settings.contactPhone,
        contactAddress: settings.contactAddress,
      });
    }
  }, [settings, form]);

  const onFinish = async (values: {
    platformName: string;
    supportEmail: string;
    contactPhone?: string;
    contactAddress?: string;
  }) => {
    try {
      await updateSettings.mutateAsync(values);
      messageApi.success('Settings saved successfully');
    } catch {
      messageApi.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '40px auto' }} />;
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ fontSize: 16 }}>General Settings</Text>
        <br />
        <Text type="secondary">Configure your platform name and contact details.</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Text strong style={{ textTransform: 'uppercase', fontSize: 11, color: '#999', letterSpacing: 0.5 }}>
          Platform Information
        </Text>
        <Divider style={{ margin: '8px 0 16px' }} />

        <Form.Item
          name="platformName"
          label="Platform Name"
          rules={[{ required: true, message: 'Platform name is required' }]}
        >
          <Input prefix={<AppstoreOutlined />} placeholder="e.g. RentFlow" />
        </Form.Item>

        <Text strong style={{ textTransform: 'uppercase', fontSize: 11, color: '#999', letterSpacing: 0.5 }}>
          Contact Details
        </Text>
        <Divider style={{ margin: '8px 0 16px' }} />

        <Form.Item
          name="supportEmail"
          label="Support Email"
          rules={[
            { required: true, message: 'Support email is required' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="e.g. support@rentflow.co.ke" />
        </Form.Item>

        <Form.Item name="contactPhone" label="Contact Phone">
          <Input prefix={<PhoneOutlined />} placeholder="e.g. 0712345678" />
        </Form.Item>

        <Form.Item name="contactAddress" label="Contact Address">
          <Input.TextArea rows={3} placeholder="e.g. Westlands, Nairobi" />
        </Form.Item>

        <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={updateSettings.isPending}>
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
