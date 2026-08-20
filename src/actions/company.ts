'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function setActiveCompanyAction(companyId: string) {
  const cookieStore = await cookies();
  
  // Guardamos el ID de la empresa activa en una cookie segura
  cookieStore.set('active_company_id', companyId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 año
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  redirect('/dashboard');
}