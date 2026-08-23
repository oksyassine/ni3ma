import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CheckinScanner } from "./client";

export default async function ScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; activityId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const sp = await searchParams;
  return <CheckinScanner initialSection={sp.section ?? "EDUCATIONAL"} activityId={sp.activityId ?? ""} />;
}
