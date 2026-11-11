import { AccountsList } from "@/components/accounts-list";
import { UsersTable } from "@/components/admin-sections";

export default function AccountsPage() {
  return <><AccountsList /><div className="section-gap"><UsersTable /></div></>;
}
