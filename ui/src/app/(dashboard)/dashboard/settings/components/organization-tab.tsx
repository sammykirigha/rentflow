'use client';

import { getCurrentOrganization, updateCurrentOrganization } from '@/lib/api/organizations.api';
import { App, Button, Form, Input, Spin } from 'antd';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export default function OrganizationTab() {
  const { message: messageApi } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', 'current'],
    queryFn: getCurrentOrganization,
    staleTime: 5 * 60 * 1000,
  });

  const updateOrg = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateCurrentOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'current'] });
      messageApi.success('Organization updated successfully');
    },
    onError: () => {
      messageApi.error('Failed to update organization');
    },
  });

  useEffect(() => {
    if (org) {
      form.setFieldsValue({
        name: org.name || '',
        supportEmail: org.supportEmail || '',
        supportPhone: org.supportPhone || '',
      });
    }
  }, [org, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      updateOrg.mutate({
        name: values.name,
        supportEmail: values.supportEmail || null,
        supportPhone: values.supportPhone || null,
      });
    } catch {
      // validation errors shown by form
    }
  };

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '40px auto' }} />;
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Organization Details</div>
        <div style={{ color: '#666', fontSize: 13 }}>
          Update your organization name and contact information. These details appear on invoices and tenant communications.
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          label="Organization Name"
          name="name"
          rules={[
            { required: true, message: 'Organization name is required' },
            { max: 100, message: 'Name must be 100 characters or less' },
          ]}
        >
          <Input placeholder="e.g. Sunrise Properties Ltd" />
        </Form.Item>

        <Form.Item
          label="Support Email"
          name="supportEmail"
          rules={[
            { type: 'email', message: 'Please enter a valid email address' },
          ]}
          help="Shown on invoices and receipts as a contact email for tenants."
        >
          <Input placeholder="e.g. support@example.com" />
        </Form.Item>

        <Form.Item
          label="Support Phone"
          name="supportPhone"
          help="Shown on invoices and receipts as a contact phone number."
        >
          <Input placeholder="e.g. +254 712 345 678" />
        </Form.Item>

        <Form.Item style={{ marginTop: 8 }}>
          <Button
            type="primary"
            onClick={handleSave}
            loading={updateOrg.isPending}
          >
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
