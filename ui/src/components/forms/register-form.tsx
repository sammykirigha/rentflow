'use client';

import { authApi } from '@/lib/api/auth.api';
import { LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { App, Button, Checkbox, Form, Input } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export default function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { message: messageApi } = App.useApp();

  const onFinish = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await authApi.register({
        lastName: values.lastName,
        firstName: values.firstName,
        email: values.email,
        password: values.password,
        phone: values.phone,
      });

      messageApi.success(response.message || 'Account created successfully!');
      router.push('/login?registered=true');
    } catch (error: unknown) {
      let errorMessage = 'Failed to create account. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      messageApi.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      name="register"
      layout="vertical"
      onFinish={onFinish}
      autoComplete="on"
      size="large"
    >
      <div style={{ display: 'flex', gap: 16 }}>
        <Form.Item
          label="First Name"
          name="firstName"
          rules={[{ required: true, message: 'First name is required' }]}
          style={{ flex: 1 }}
        >
          <Input prefix={<UserOutlined />} placeholder="First name" />
        </Form.Item>

        <Form.Item
          label="Last Name"
          name="lastName"
          rules={[{ required: true, message: 'Last name is required' }]}
          style={{ flex: 1 }}
        >
          <Input prefix={<UserOutlined />} placeholder="Last name" />
        </Form.Item>
      </div>

      <Form.Item
        label="Email address"
        name="email"
        rules={[
          { required: true, message: 'Please enter your email' },
          { type: 'email', message: 'Please enter a valid email' },
        ]}
      >
        <Input prefix={<MailOutlined />} placeholder="Enter your email" autoComplete="email" />
      </Form.Item>

      <Form.Item
        label="Phone (optional)"
        name="phone"
        rules={[
          { pattern: /^(?:\+254|0)\d{9}$/, message: 'Invalid Kenyan phone number' },
        ]}
      >
        <Input prefix={<PhoneOutlined />} placeholder="0712345678" />
      </Form.Item>

      <div style={{ display: 'flex', gap: 16 }}>
        <Form.Item
          label="Password"
          name="password"
          rules={[
            { required: true, message: 'Please create a password' },
            { min: 6, message: 'Password must be at least 6 characters' },
          ]}
          style={{ flex: 1 }}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Create a password" />
        </Form.Item>

        <Form.Item
          label="Confirm Password"
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Passwords don't match"));
              },
            }),
          ]}
          style={{ flex: 1 }}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
        </Form.Item>
      </div>

      <Form.Item
        name="agreeToTerms"
        valuePropName="checked"
        rules={[
          {
            validator: (_, value) =>
              value ? Promise.resolve() : Promise.reject(new Error('You must agree to the terms')),
          },
        ]}
      >
        <Checkbox>
          I agree to the <Link href="/terms" target="_blank">Terms of Service</Link>{' '}
          and <Link href="/privacy-policy" target="_blank">Privacy Policy</Link>
        </Checkbox>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isSubmitting} block>
          Create account
        </Button>
      </Form.Item>
    </Form>
  );
}
