'use client';

import { useAuth } from '@/contexts/AuthContext';
import { userApi } from '@/lib/api/user.api';
import { useUserStore } from '@/stores/user.store';
import { User } from '@/types/users';
import { MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, App } from 'antd';
import { useEffect, useState } from 'react';

export default function UpdateUserProfileForm() {
  const [isLoading, setIsLoading] = useState(false);
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore(state => state.setUser);
  const { fetchUserData } = useAuth();
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      });
    }
  }, [user, form]);

  const onFinish = async (values: { firstName: string; lastName: string; email: string; phone: string }) => {
    setIsLoading(true);
    try {
      await userApi.updateProfile(values);
      messageApi.success('Profile updated successfully!');
      fetchUserData();
      setUser({
        ...user,
        ...values,
      } as User);
    } catch (error) {
      console.error('Update profile error:', error);
      const err = error as { response?: { data?: { message?: string } } };
      const errorMessage = err.response?.data?.message || 'Failed to update profile. Please try again.';
      messageApi.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true, message: 'First name is required' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Enter your first name" />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true, message: 'Last name is required' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Enter your last name" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Enter your email" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[{ required: true, message: 'Phone number is required' }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="e.g. 0712345678" />
          </Form.Item>
        </div>

        <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={isLoading}>
            Update Profile
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
