import RegisterForm from '@/components/forms/register-form';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign Up | RentFlow',
  description: 'Create your RentFlow account.',
};

export default function RegisterPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '48px 16px',
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: 32,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Create your account
          </h2>
          <p style={{ color: '#666', marginTop: 8 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#1890ff' }}>
              Sign in
            </Link>
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
