"use client";

import {
  UserGroupIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const doctorLinks = [
  { name: "Overview", href: "/dashboard", icon: HomeIcon },
  { name: "Patients", href: "/dashboard/patients", icon: UserGroupIcon },
  {
    name: "Appointments",
    href: "/dashboard/appointments",
    icon: CalendarDaysIcon,
  },
  {
    name: "Records",
    href: "/dashboard/records",
    icon: ClipboardDocumentListIcon,
  },
  {
    name: "Billing",
    href: "/dashboard/billing",
    icon: CreditCardIcon,
  },
];

const patientLinks = [
  { name: "My care", href: "/dashboard/my-care", icon: HomeIcon },
  { name: "Appointments", href: "/dashboard/appointments", icon: CalendarDaysIcon },
];

export default function NavLinks({ role }: { role: string }) {
  const pathname = usePathname();
  const links = role === "patient" ? patientLinks : doctorLinks;
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              "flex h-[48px] grow items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-teal-50 hover:text-teal-800 md:flex-none md:justify-start md:p-2 md:px-3",
              {
                "bg-teal-50 font-semibold text-teal-800": pathname === link.href || (link.href === "/dashboard/records" && pathname.startsWith("/dashboard/records")) || (link.href === "/dashboard/billing" && pathname.startsWith("/dashboard/billing")),
              },
            )}
          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}
