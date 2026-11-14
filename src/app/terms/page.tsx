import { renderStaticCmsPage } from "@/components/store/CmsPageRenderer";
export const dynamic = "force-dynamic";
export default async function TermsPage() {
  return renderStaticCmsPage("terms");
}

