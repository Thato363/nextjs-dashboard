'use client';

import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { Button } from './button';
import { useActionState } from "react";
import { authenticate } from "@/app/lib/actions";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-5">
        <div className="w-full">
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-slate-300 bg-white py-3 pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                required
              />
              <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 peer-focus:text-teal-700" />
            </div>
          </div>
          <div className="mt-4">
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-slate-300 bg-white py-3 pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                id="password"
                type="password"
                name="password"
                placeholder="Enter password"
                required
                minLength={6}
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 peer-focus:text-teal-700" />
            </div>
          </div>
        </div>
        <input type="hidden" name="redirectTo" value={callbackUrl} />
        <Button className="mt-2 w-full bg-teal-800 hover:bg-teal-900" aria-disabled={isPending}>
          Sign in <ArrowRightIcon className="ml-auto h-5 w-5 text-white" />
        </Button>
        <div
          className="flex min-h-8 items-center gap-2"
          aria-live="polite"
          aria-atomic="true"
        >
          {errorMessage && (
            <>
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">{errorMessage}</p>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
