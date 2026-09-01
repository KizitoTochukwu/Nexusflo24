import { PageHeader } from "@/components/platform-admin/PlatformPrimitives";
import AdminStoreCatalogue from "@/pages/admin/AdminStoreCatalogue";

export default function PlatformCatalogue() {
  return (
    <div>
      <PageHeader
        title="Store Catalogue"
        description="Add, edit, price and publish everything shoppers see in the Automation Store."
      />
      <AdminStoreCatalogue bare />
    </div>
  );
}
