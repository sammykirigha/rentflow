'use client';

import { authApi } from '@/lib/api/auth.api';
import { MailOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input, App, Result } from 'antd';
import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();

  const onFinish = async (values: { email: string }) => {
    setIsLoading(true);
    try {
      const result = await authApi.forgotPassword(values);
      setIsSubmitted(true);
      messageApi.success(result.message || 'Password reset link sent successfully!');
    } catch (error) {
      console.error('Forgot password error:', error);
      const err = error as { response?: { data?: { message?: string } } };
      const errorMessage = err.response?.data?.message || 'Failed to send reset link. Please try again.';
      messageApi.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title="Check your email"
        subTitle="We've sent a password reset link to your email address. Please check your inbox and follow the instructions."
        extra={[
          <Button key="retry" onClick={() => { setIsSubmitted(false); form.resetFields(); }}>
            Try again
          </Button>,
          <Link key="login" href="/login">
            <Button type="link">Back to sign in</Button>
          </Link>,
        ]}
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1890ff' }}>
          <ArrowLeftOutlined />
          Back to sign in
        </Link>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="email"
          label="Email address"
          rules={[
            { required: true, message: 'Please enter your email address' },
            { type: 'email', message: 'Please enter a valid email address' },
          ]}
          extra="We'll send you a link to reset your password."
        >
          <Input
            prefix={<MailOutlined />}
            type="email"
            placeholder="Enter your email address"
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
            Send reset link
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#666' }}>Remember your password? </span>
          <Link href="/login" style={{ color: '#1890ff' }}>Sign in</Link>
        </div>
      </Form>
    </div>
  );
}
