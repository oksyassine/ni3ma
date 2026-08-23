import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">403</h1>
        <p className="text-xl text-muted-foreground">غير مصرح لك بالوصول إلى هذه الصفحة</p>
        <Link href="/">
          <Button>العودة للرئيسية</Button>
        </Link>
      </div>
    </div>
  );
}
