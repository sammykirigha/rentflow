import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Registration | RentFlow',
  description: 'RentFlow registration is invite-only.',
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
        maxWidth: 420,
        width: '100%',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: 32,
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          Registration is Invite-Only
        </h2>
        <p style={{ color: '#666', marginTop: 16, lineHeight: 1.6 }}>
          RentFlow accounts are provisioned by your organization administrator.
          If you believe you should have an account, please contact your property manager.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              background: '#1890ff',
              color: '#fff',
              padding: '10px 32px',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
