'use client';

import { createPlatformOrganization } from '@/lib/api/platform.api';
import { CopyOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, message, Modal, Select, Typography } from 'antd';
import { useState } from 'react';

const { Text } = Typography;

interface CreateOrganizationModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface CreatedResult {
  ownerEmail: string;
  temporaryPassword: string;
  emailSent: boolean;
}

export default function CreateOrganizationModal({
  open,
  onClose,
  onCreated,
}: CreateOrganizationModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreatedResult | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    form.setFieldsValue({ slug });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const result = await createPlatformOrganization(values);
      setCreatedResult({
        ownerEmail: result?.ownerEmail || values.ownerEmail,
        temporaryPassword: result?.temporaryPassword || '',
        emailSent: result?.emailSent ?? false,
      });
      onCreated();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedResult(null);
    form.resetFields();
    onClose();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard`);
  };

  // After creation — show credentials
  if (createdResult) {
    return (
      <Modal
        title="Organization Created"
        open={open}
        onCancel={handleClose}
        footer={[
          <Button key="close" type="primary" onClick={handleClose}>
            Done
          </Button>,
        ]}
        width={520}
      >
        {createdResult.emailSent ? (
          <Alert
            type="success"
            showIcon
            message="Welcome email sent successfully"
            description={`An email with login credentials was sent to ${createdResult.ownerEmail}.`}
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            message="Welcome email failed to send"
            description="The email could not be delivered. Please share the credentials below manually with the organization owner."
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Email</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong>{createdResult.ownerEmail}</Text>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(createdResult.ownerEmail, 'Email')}
              />
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Temporary Password</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong code>{createdResult.temporaryPassword}</Text>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(createdResult.temporaryPassword, 'Password')}
              />
            </div>
          </div>
        </div>

        <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
          The owner will be required to change their password on first login.
        </Text>
      </Modal>
    );
  }

  return (
    <Modal
      title="Create Organization"
      open={open}
      onOk={handleSubmit}
      onCancel={handleClose}
      okText="Create"
      confirmLoading={loading}
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Organization</div>
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Organization name is required' }]}
        >
          <Input placeholder="e.g. Sunrise Properties" onChange={handleNameChange} />
        </Form.Item>
        <Form.Item
          name="slug"
          label="Slug"
          rules={[
            { required: true, message: 'Slug is required' },
            { pattern: /^[a-z0-9-]+$/, message: 'Lowercase letters, numbers and hyphens only' },
          ]}
        >
          <Input placeholder="e.g. sunrise-properties" />
        </Form.Item>

        <div style={{ marginBottom: 8, marginTop: 16, fontWeight: 600, fontSize: 14 }}>Owner</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item
            name="ownerFirstName"
            label="First Name"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="John" />
          </Form.Item>
          <Form.Item
            name="ownerLastName"
            label="Last Name"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Doe" />
          </Form.Item>
        </div>
        <Form.Item
          name="ownerEmail"
          label="Email"
          rules={[
            { required: true, message: 'Email is required' },
            { type: 'email', message: 'Invalid email' },
          ]}
        >
          <Input placeholder="john@example.com" />
        </Form.Item>
        <Form.Item name="ownerPhone" label="Phone (optional)">
          <Input placeholder="0712345678" />
        </Form.Item>

        <div style={{ marginBottom: 8, marginTop: 16, fontWeight: 600, fontSize: 14 }}>Subscription</div>
        <Form.Item name="plan" label="Plan">
          <Select
            placeholder="Select plan (default: Pro trial)"
            allowClear
            options={[
              { value: 'basic', label: 'Basic' },
              { value: 'pro', label: 'Pro' },
              { value: 'enterprise', label: 'Enterprise' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
