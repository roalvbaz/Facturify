import { redirect } from 'next/navigation';

export default function RootPage() {
  // Tan pronto como alguien entra a la raíz, lo mandamos al login
  redirect('/login');
}