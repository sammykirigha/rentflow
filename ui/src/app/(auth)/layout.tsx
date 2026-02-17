import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'RentFlow - Authentication',
  description: 'Sign in to your RentFlow account',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {children}
    </div>
  );
}
