import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AttendancePage } from "@/components/attendance/attendance-page";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  return <AttendancePage section="SOCIAL" />;
}
