import { HeartIcon } from "@heroicons/react/24/solid";

export default function ClinicLogo({ light = false }: { light?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${light ? "text-white" : "text-slate-900"}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
        <HeartIcon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-lg font-bold leading-tight">CareFlow</span>
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.16em] ${light ? "text-teal-100" : "text-teal-700"}`}>Clinic</span>
      </span>
    </div>
  );
}
