import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    return redirect('/dashboard');
  }

  return redirect('/login');
}
