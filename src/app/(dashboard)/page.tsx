import { redirect } from 'next/navigation';

export default function DashboardRootRedirect() {
  redirect('/academy');
  return null;
}