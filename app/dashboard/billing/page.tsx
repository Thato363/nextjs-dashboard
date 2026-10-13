import { CreditCardIcon } from "@heroicons/react/24/outline";
import { fetchMedicalInvoices, fetchPatients } from "@/app/lib/data";
import BillingForm from "@/app/ui/billing/billing-form";
import { lusitana } from "@/app/ui/fonts";

const methodLabels: Record<string, string> = {
  medical_aid: "Medical aid",
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank transfer",
  other: "Other",
};

function amount(value: number) {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function statusTone(status: string) {
  if (status === "paid") return "bg-emerald-50 text-emerald-800";
  if (status === "denied") return "bg-rose-50 text-rose-800";
  return "bg-amber-50 text-amber-800";
}

export default async function BillingPage() {
  const [patients, invoices] = await Promise.all([fetchPatients(), fetchMedicalInvoices()]);
  const paidTotal = invoices.filter((invoice) => invoice.payment_status === "paid").reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const pendingTotal = invoices.filter((invoice) => invoice.payment_status === "pending").reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const medicalAidCount = invoices.filter((invoice) => invoice.payment_method === "medical_aid").length;

  return (
    <main className="mx-auto w-full max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Revenue cycle</p>
          <h1 className={`${lusitana.className} mt-1 text-2xl text-slate-900 md:text-3xl`}>Billing & payments</h1>
          <p className="mt-2 text-sm text-slate-500">Track patient charges, medical aid claims, and other payment sources.</p>
        </div>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-3" aria-label="Billing summary">
        {[
          { label: "Paid", value: amount(paidTotal), tone: "text-emerald-800", detail: "Recorded receipts" },
          { label: "Pending", value: amount(pendingTotal), tone: "text-amber-800", detail: "Awaiting payment or claim" },
          { label: "Medical aid invoices", value: String(medicalAidCount), tone: "text-teal-800", detail: "Claims and provider payments" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${item.tone}`}>{item.value}</p>
            <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
          </div>
        ))}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <BillingForm patients={patients.map((patient) => ({ id: patient.id, full_name: patient.full_name }))} />

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent invoices</h2>
              <p className="mt-1 text-xs text-slate-500">{invoices.length} records</p>
            </div>
            <CreditCardIcon className="h-5 w-5 text-teal-700" />
          </div>

          {invoices.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-800">No billing records yet</p>
              <p className="mt-1 text-xs text-slate-500">New patient charges and claims will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <article key={invoice.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{invoice.patient_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{invoice.service_description}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{amount(Number(invoice.amount))}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 font-medium text-teal-800">{methodLabels[invoice.payment_method] ?? "Other"}</span>
                    {invoice.medical_aid_provider && <span className="text-slate-500">{invoice.medical_aid_provider}</span>}
                    <span className={`ml-auto rounded-full px-2.5 py-1 font-medium capitalize ${statusTone(invoice.payment_status)}`}>{invoice.payment_status}</span>
                  </div>
                  <div className="mt-2 flex justify-between gap-3 text-[11px] text-slate-400">
                    <span>{invoice.reference_number ? `Ref ${invoice.reference_number}` : invoice.doctor_name}</span>
                    <time dateTime={invoice.issued_at}>{new Date(invoice.issued_at).toLocaleDateString()}</time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
