import { renderStaticCmsPage } from "@/components/store/CmsPageRenderer";
export const dynamic = "force-dynamic";
export default async function PrivacyPolicyPage() {
  return renderStaticCmsPage("privacy-policy");
}

