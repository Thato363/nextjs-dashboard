import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import ClinicLogo from '@/app/ui/clinic-logo';
import { PowerIcon } from '@heroicons/react/24/outline';
import { signOut } from "@/auth";

export default function SideNav({ role }: { role: string }) {
  const navigationRole = role === "doctor" || role === "admin" ? role : "patient";
  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-2">
      <Link
        className="mb-3 flex h-16 items-center justify-start rounded-lg border border-teal-100 bg-white p-4 shadow-sm md:h-20"
        href="/dashboard"
      >
        <ClinicLogo />
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks role={navigationRole} />
        <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="flex h-[48px] w-full grow items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-teal-50 hover:text-teal-800 md:flex-none md:justify-start md:p-2 md:px-3">
            <PowerIcon className="w-6" />
            <div className="hidden md:block">Sign Out</div>
          </button>
        </form>
      </div>
    </div>
  );
}
