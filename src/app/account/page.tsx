import React from "react";
import { renderAccountPage } from "@/components/store/AccountPageRenderer";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  return renderAccountPage("orders");
}

