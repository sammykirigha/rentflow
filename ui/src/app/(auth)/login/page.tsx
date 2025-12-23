import LoginForm from '@/components/forms/login-form';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign In | MasomoDash',
  description: 'Sign in to your MasomoDash account to access educational papers, connect with teachers, and manage your academic resources.',
  keywords: 'login, sign in, education, papers, teachers, students, Kenya',
  openGraph: {
    title: 'Sign In | MasomoDash',
    description: 'Access your MasomoDash account to buy and sell educational papers.',
    type: 'website',
  },
};

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center bg-gray-50! min-h-screen py-12 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white z-20 rounded-md shadow-md p-6">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Create a new account
            </Link>
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}