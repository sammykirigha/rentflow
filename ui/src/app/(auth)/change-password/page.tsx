'use client';

import api from '@/lib/api';
import { Button, Form, Input, message, Typography } from 'antd';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const { Title, Text } = Typography;

export default function ChangePasswordPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const checkedRef = useRef(false);

  const isForced = session?.user?.mustChangePassword === true;

  // Check fresh backend state once on mount — if mustChangePassword is already false,
  // the password was changed in a previous attempt but the session is stale.
  useEffect(() => {
    if (!session || !isForced || checkedRef.current) return;
    checkedRef.current = true;

    const checkState = async () => {
      try {
        const res = await api.get('/auth/me');
        // axios interceptor already unwraps response.data.data → response.data
        if (!res.data?.mustChangePassword) {
          message.info('Your password has already been updated. Please log in.');
          await signOut({ redirect: false });
          router.replace('/login');
        }
      } catch {
        // If the request fails (401, network error), show the form anyway
      }
    };
    checkState();
  }, [session, isForced, router]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (values.newPassword !== values.confirmPassword) {
        message.error('Passwords do not match');
        return;
      }

      setLoading(true);

      const res = await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      // The API returns fresh tokens with mustChangePassword: false.
      // Update sessionStorage so subsequent API calls use the new token,
      // then sign out and re-login to refresh the NextAuth session cleanly.
      if (res.data?.accessToken) {
        sessionStorage.setItem('access_token', res.data.accessToken);
      }

      message.success('Password changed successfully. Please log in with your new password.');

      await signOut({ redirect: false });
      router.replace('/login');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '48px 16px',
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: 32,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            {isForced ? 'Set Your New Password' : 'Change Your Password'}
          </Title>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {isForced
              ? 'You must change your temporary password before continuing.'
              : 'Enter your current password and choose a new one.'}
          </Text>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="currentPassword"
            label={isForced ? 'Temporary Password' : 'Current Password'}
            rules={[{ required: true, message: isForced ? 'Please enter your temporary password' : 'Please enter your current password' }]}
          >
            <Input.Password placeholder={isForced ? 'Enter temporary password' : 'Enter current password'} size="large" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password placeholder="Enter new password" size="large" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            rules={[
              { required: true, message: 'Please confirm your new password' },
            ]}
          >
            <Input.Password placeholder="Confirm new password" size="large" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              {isForced ? 'Set New Password' : 'Change Password'}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
