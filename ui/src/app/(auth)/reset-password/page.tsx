'use client';

import ResetPasswordForm from '@/components/forms/ResetPasswordForm';
import { Button, Result } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Spin } from 'antd';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <Result
        status="error"
        title="Invalid Reset Link"
        subTitle="The password reset link is invalid or has expired. Please request a new password reset."
        extra={[
          <Link key="forgot" href="/forgot-password">
            <Button type="primary">Request New Reset Link</Button>
          </Link>,
          <Link key="login" href="/login">
            <Button>Back to Sign In</Button>
          </Link>,
        ]}
      />
    );
  }

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '48px 16px',
    }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: 32,
      }}>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
