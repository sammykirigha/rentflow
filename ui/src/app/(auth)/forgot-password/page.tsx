import ForgotPasswordForm from '@/components/forms/ForgotPasswordForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | MasomoDash',
  description: 'Reset your MasomoDash account password. Enter your email address to receive a password reset link.',
  keywords: 'forgot password, reset password, password recovery, education, MasomoDash, Kenya',
  openGraph: {
    title: 'Forgot Password | MasomoDash',
    description: 'Reset your MasomoDash account password securely.',
    type: 'website',
  },
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white rounded-md shadow-md p-6">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            No worries! Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}