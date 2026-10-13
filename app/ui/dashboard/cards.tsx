import {
  ClockIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';
import { fetchCardData } from "@/app/lib/data";

const iconMap = {
  collected: CheckBadgeIcon,
  customers: UserGroupIcon,
  pending: ClockIcon,
  invoices: ClipboardDocumentCheckIcon,
};

export default async function CardWrapper() {
  const {
    numberOfInvoices,
    numberOfCustomers,
    totalPaidInvoices,
    totalPendingInvoices,
  } = await fetchCardData();
  
  return (
    <>
      {/* NOTE: Uncomment this code in Chapter 9 */}

      <Card title="Collected" value={totalPaidInvoices} type="collected" />
      <Card title="Pending" value={totalPendingInvoices} type="pending" />
      <Card title="Total Invoices" value={numberOfInvoices} type="invoices" />
      <Card
        title="Total Customers"
        value={numberOfCustomers}
        type="customers"
      />
    </>
  );
}

export function Card({
  title,
  value,
  type,
}: {
  title: string;
  value: number | string;
  type: 'invoices' | 'customers' | 'pending' | 'collected';
}) {
  const Icon = iconMap[type];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center text-slate-600">
        {Icon ? <Icon className="h-5 w-5 text-teal-700" /> : null}
        <h3 className="ml-2 text-sm font-medium">{title}</h3>
      </div>
      <p
        className={`${lusitana.className}
          mt-4 truncate text-3xl font-bold text-slate-900`}
      >
        {value}
      </p>
    </div>
  );
}
