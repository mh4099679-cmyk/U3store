import { renderStaticCmsPage } from "@/components/store/CmsPageRenderer";
export const dynamic = "force-dynamic";
export default async function ReturnPolicyPage() {
  return renderStaticCmsPage("return-policy");
}

