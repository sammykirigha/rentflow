'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { App, Button, Checkbox, Form, Input } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface Props {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { message: messageApi } = App.useApp();

  const onFinish = async (values: LoginFormValues) => {
    try {
      setIsSubmitting(true);
      const result = await login(values.email, values.password);

      if (result.success) {
        messageApi.success('Login successful! Redirecting...');
        router.replace('/dashboard');
        onSuccess?.();
      } else {
        messageApi.error(result.error || 'Login failed. Please try again.');
      }
    } catch {
      messageApi.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      name="login"
      layout="vertical"
      onFinish={onFinish}
      autoComplete="on"
      size="large"
    >
      <Form.Item
        label="Email address"
        name="email"
        rules={[
          { required: true, message: 'Please enter your email' },
          { type: 'email', message: 'Please enter a valid email' },
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="Enter your email"
          autoComplete="email"
        />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[
          { required: true, message: 'Please enter your password' },
          { min: 6, message: 'Password must be at least 6 characters' },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Enter your password"
          autoComplete="current-password"
        />
      </Form.Item>

      <Form.Item>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Form.Item name="rememberMe" valuePropName="checked" noStyle>
            <Checkbox>Remember me</Checkbox>
          </Form.Item>
          <Link href="/forgot-password">Forgot your password?</Link>
        </div>
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={isSubmitting}
          block
        >
          Sign in
        </Button>
      </Form.Item>
    </Form>
  );
}
