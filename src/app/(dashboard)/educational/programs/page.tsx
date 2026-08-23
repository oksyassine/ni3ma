import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProgramsPage } from "@/components/programs/programs-page";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  return <ProgramsPage section="EDUCATIONAL" />;
}
