import { renderStaticCmsPage } from "@/components/store/CmsPageRenderer";
export const dynamic = "force-dynamic";
export default async function AboutPage() {
  return renderStaticCmsPage("about");
}

