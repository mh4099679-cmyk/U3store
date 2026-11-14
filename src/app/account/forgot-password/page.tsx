import React from "react";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { StoreShell } from "@/components/store/StoreShell";
import { CustomerAuthForm } from "@/components/store/CustomerAuthForm";

export const dynamic = "force-dynamic";

export default async function CustomerForgotPasswordPage() {
  const lang = await getStorefrontLanguage();

  return (
    <StoreShell>
      <div className="max-w-7xl mx-auto px-4 py-14">
        <CustomerAuthForm mode="forgot" lang={lang} />
      </div>
    </StoreShell>
  );
}

