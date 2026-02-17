'use client';

import { userApi } from '@/lib/api/user.api';
import { LockOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, App, Spin } from 'antd';
import { useState } from 'react';

export default function SecuritySettings() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();

  const onChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    setIsSubmitting(true);
    try {
      await userApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      messageApi.success('Password changed successfully!');
      form.resetFields();
    } catch (error) {
      console.error('Change password error:', error);
      const err = error as { response?: { data?: { message?: string } } };
      const errorMessage = err.response?.data?.message || 'Failed to change password. Please try again.';
      messageApi.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card title={<span><LockOutlined /> Change Password</span>} size="small">
      <Form form={form} layout="vertical" onFinish={onChangePassword}>
        <Form.Item
          name="currentPassword"
          label="Current Password"
          rules={[{ required: true, message: 'Current password is required' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Enter current password" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: 'New password is required' },
            { min: 6, message: 'Password must be at least 6 characters' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Enter new password" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your new password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Passwords don't match"));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Change Password
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
