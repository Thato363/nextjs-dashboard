import { lusitana } from "@/app/ui/fonts";
import type { MedicalInvoice } from "@/app/lib/data";

const methods = [
  { key: "medical_aid", label: "Medical aid", color: "#0f766e" },
  { key: "card", label: "Card", color: "#1598bb" },
  { key: "cash", label: "Cash", color: "#e0a62c" },
  { key: "bank_transfer", label: "Bank transfer", color: "#8066c7" },
  { key: "other", label: "Other", color: "#d27662" },
] as const;

function formatAmount(amount: number) {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export default function PaymentMethodChart({ invoices }: { invoices: MedicalInvoice[] }) {
  const paidInvoices = invoices.filter((invoice) => invoice.payment_status === "paid");
  const totalPaid = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const pendingTotal = invoices
    .filter((invoice) => invoice.payment_status === "pending")
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const counts = new Map(methods.map((method) => [method.key, 0]));
  paidInvoices.forEach((invoice) => {
    const key = methods.some((method) => method.key === invoice.payment_method) ? invoice.payment_method : "other";
    counts.set(key as typeof methods[number]["key"], (counts.get(key as typeof methods[number]["key"]) ?? 0) + Number(invoice.amount));
  });

  const totalMix = methods.reduce((sum, method) => sum + (counts.get(method.key) ?? 0), 0);
  let offset = 0;
  const slices = methods.map((method) => {
    const amount = counts.get(method.key) ?? 0;
    const percent = totalMix ? (amount / totalMix) * 100 : 0;
    const slice = { ...method, amount, percent, offset };
    offset += percent;
    return slice;
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Clinic billing</p>
          <h2 className={`${lusitana.className} mt-1 text-xl text-slate-900`}>Paid by method</h2>
          <p className="mt-1 text-xs text-slate-500">Paid invoice amounts by payment source</p>
        </div>
        <a href="/dashboard/billing" className="text-xs font-semibold text-teal-800 hover:underline">View billing</a>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
        <div className="relative h-40 w-40 shrink-0" role="img" aria-label={`Paid payment mix totaling ${formatAmount(totalPaid)}`}>
          <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#edf2f5" strokeWidth="8" />
            {totalMix > 0 && slices.filter((slice) => slice.percent > 0).map((slice) => (
              <circle
                key={slice.key}
                cx="21"
                cy="21"
                r="15.9155"
                fill="none"
                stroke={slice.color}
                strokeWidth="8"
                strokeDasharray={`${slice.percent} ${100 - slice.percent}`}
                strokeDashoffset={-slice.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums text-slate-900">{formatAmount(totalPaid)}</span>
            <span className="text-xs text-slate-500">paid</span>
          </div>
        </div>

        <ul className="w-full max-w-xs space-y-2">
          {slices.map((slice) => (
            <li key={slice.key} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: slice.color }} />
              <span className="flex-1 text-slate-600">{slice.label}</span>
              <span className="tabular-nums font-medium text-slate-800">{formatAmount(slice.amount)}</span>
              <span className="w-9 text-right tabular-nums text-slate-500">{totalMix ? `${Math.round(slice.percent)}%` : "0%"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-500">Pending payments</span>
        <span className="font-semibold tabular-nums text-amber-700">{formatAmount(pendingTotal)}</span>
      </div>
      {invoices.length === 0 && <p className="mt-3 text-center text-xs text-slate-500">Billing activity appears here when an invoice is recorded.</p>}
    </section>
  );
}
