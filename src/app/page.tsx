import { redirect } from 'next/navigation';
import { getCurrentUser, getRoleHome } from '@/lib/auth';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  redirect(getRoleHome(user.role));
}
