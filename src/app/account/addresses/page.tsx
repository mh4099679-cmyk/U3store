import { renderAccountPage } from "@/components/store/AccountPageRenderer";
export const dynamic = "force-dynamic";
export default async function AccountAddressesPage() {
  return renderAccountPage("addresses");
}
