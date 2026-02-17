'use client';

import { authApi } from '@/lib/api/auth.api';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input, App, Result } from 'antd';
import Link from 'next/link';
import { useState } from 'react';

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();

  const onFinish = async (values: { newPassword: string }) => {
    setIsLoading(true);
    try {
      const result = await authApi.resetPassword({
        token,
        newPassword: values.newPassword,
      });

      setIsSubmitted(true);
      messageApi.success(result.message || 'Password reset successfully!');
    } catch (error) {
      console.error('Reset password error:', error);
      const err = error as { response?: { data?: { message?: string } } };
      const errorMessage = err.response?.data?.message || 'Failed to reset password. Please try again.';
      messageApi.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title="Password reset successful!"
        subTitle="Your password has been successfully reset. You can now sign in with your new password."
        extra={
          <Link href="/login">
            <Button type="primary">Continue to sign in</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Reset your password</h2>
        <p style={{ color: '#666', marginTop: 8 }}>Please enter your new password below.</p>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter your new password' },
            { min: 8, message: 'Password must be at least 8 characters' },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
              message: 'Must contain uppercase, lowercase, number, and special character',
            },
          ]}
          extra="Must contain at least 8 characters with uppercase, lowercase, number, and special character."
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter your new password"
            size="large"
          />
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
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Confirm your new password"
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
            Reset password
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center' }}>
          <Link href="/login">
            <Button type="link">Back to sign in</Button>
          </Link>
        </div>
      </Form>
    </div>
  );
}
