import { renderStaticCmsPage } from "@/components/store/CmsPageRenderer";
export const dynamic = "force-dynamic";
export default async function ShippingPolicyPage() {
  return renderStaticCmsPage("shipping-policy");
}

