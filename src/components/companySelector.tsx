'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setActiveCompanyAction } from '@/actions/company.actions';

interface Company {
  id: string;
  name: string;
  tax_id: string;
  role: string;
}

export default function CompanySelector({
  companies,
  activeCompanyId,
}: {
  companies: Company[];
  activeCompanyId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    startTransition(async () => {
      await setActiveCompanyAction(newId);
      router.refresh();
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa:</span>
        <select
          value={activeCompanyId}
          onChange={handleChange}
          disabled={isPending}
          className="bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer disabled:opacity-50"
          style={{ minWidth: '0', flex: 1 }}
        >
          {companies.map((comp) => (
            <option key={comp.id} value={comp.id} className="bg-white dark:bg-slate-900">
              {comp.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
