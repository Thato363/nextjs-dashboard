"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/ui/button";

type PatientOption = { id: string; full_name: string };

export default function BillingForm({ patients }: { patients: PatientOption[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("medical_aid");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: formData.get("patient_id"),
          service_description: formData.get("service_description"),
          amount: Number(formData.get("amount")),
          payment_method: formData.get("payment_method"),
          payment_status: formData.get("payment_status"),
          medical_aid_provider: formData.get("medical_aid_provider"),
          reference_number: formData.get("reference_number"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Could not save the billing record.");
        return;
      }

      form.reset();
      setPaymentMethod("medical_aid");
      setMessage("Billing record saved.");
      router.refresh();
    } catch {
      setMessage("Could not reach the billing service. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Record a payment</h2>
      <p className="mt-1 text-sm text-slate-500">Link a service charge to a patient and payment source.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Patient
          <select name="patient_id" required defaultValue="" className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15">
            <option value="" disabled>Select patient</option>
            {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Service or invoice description
          <input name="service_description" required maxLength={240} placeholder="Consultation, lab work..." className="rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Amount
          <input name="amount" required type="number" min="0.01" max="1000000" step="0.01" inputMode="decimal" placeholder="0.00" className="rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Payment method
          <select name="payment_method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15">
            <option value="medical_aid">Medical aid</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other</option>
          </select>
        </label>

        {paymentMethod === "medical_aid" && (
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Medical aid provider
            <input name="medical_aid_provider" required maxLength={120} placeholder="Provider name" className="rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" />
          </label>
        )}

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Status
          <select name="payment_status" defaultValue="pending" className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15">
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="denied">Denied</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
          Payment or claim reference <span className="font-normal text-slate-400">Optional</span>
          <input name="reference_number" maxLength={120} placeholder="Claim number, receipt, or transaction reference" className="rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={`text-sm ${message === "Billing record saved." ? "text-emerald-700" : "text-rose-700"}`}>{message}</p>
        <Button type="submit" disabled={pending || patients.length === 0} className="bg-teal-800 hover:bg-teal-900">
          {pending ? "Saving..." : "Save billing record"}
        </Button>
      </div>
      {patients.length === 0 && <p className="mt-3 text-sm text-amber-700">Add a patient before recording an invoice.</p>}
    </form>
  );
}
