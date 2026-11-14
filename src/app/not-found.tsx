import React from "react";
import Link from "next/link";
import { StoreShell } from "@/components/store/StoreShell";

export default async function NotFound() {
  return (
    <StoreShell>
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
        <p className="text-xs uppercase tracking-[0.25em] text-[#73777D] font-bold">404 — U3 STORE</p>
        <h1 className="font-heading text-4xl font-bold text-jet">Page Not Found</h1>
        <p className="text-sm text-neutralgray">
          The page you are looking for does not exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-jet hover:bg-[#292B2E] text-white font-heading text-xs font-bold uppercase tracking-widest px-8 py-4 transition-colors"
        >
          Return to Homepage
        </Link>
      </div>
    </StoreShell>
  );
}

