import RegisterForm from '@/components/forms/register-form';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign Up | MasomoDash',
  description: 'Create your MasomoDash account to buy educational papers from teachers or sell your academic materials. Join Kenya\'s leading educational marketplace.',
  keywords: 'register, sign up, education, papers, teachers, students, Kenya, academic marketplace',
  openGraph: {
    title: 'Sign Up | MasomoDash',
    description: 'Join MasomoDash to access quality educational papers and connect with teachers across Kenya.',
    type: 'website',
  },
};

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md lg:max-w-xl w-full space-y-8 bg-white z-20 rounded-md shadow-md p-6">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}