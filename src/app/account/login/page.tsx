import React from "react";
import { redirect } from "next/navigation";
import { getStorefrontLanguage, getCurrentCustomer } from "@/lib/auth/session";
import { StoreShell } from "@/components/store/StoreShell";
import { CustomerAuthForm } from "@/components/store/CustomerAuthForm";

export const dynamic = "force-dynamic";

export default async function CustomerLoginPage() {
  const customer = await getCurrentCustomer();
  if (customer) redirect("/account");
  const lang = await getStorefrontLanguage();

  return (
    <StoreShell>
      <div className="max-w-7xl mx-auto px-4 py-14">
        <CustomerAuthForm mode="login" lang={lang} />
      </div>
    </StoreShell>
  );
}

