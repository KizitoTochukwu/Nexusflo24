import AdminBlogManager from "@/pages/admin/AdminBlogManager";
import { PageHeader } from "@/components/platform-admin/PlatformPrimitives";

export default function PlatformContent() {
  return (
    <div>
      <PageHeader
        title="Blog & Pages"
        description="Platform-owned marketing content. Changes here affect the public NexusFlo24 site, not any customer workspace."
      />
      <AdminBlogManager bare />
    </div>
  );
}
