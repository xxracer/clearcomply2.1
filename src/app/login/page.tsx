
import { LoginForm } from "@/components/auth/login-form";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-0 left-0 p-4 md:p-6">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ClipboardCheck className="h-7 w-7" />
            <span className="text-xl font-bold font-headline">Clear Comply HR</span>
          </Link>
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <h1 className="font-headline text-3xl font-bold text-center">Secure Login</h1>
          <p className="text-muted-foreground text-center">Enter your credentials to access your dashboard.</p>
        </div>
        <LoginForm />
         <div className="mt-4 text-center text-xs">
          <Link href="/superuser/login" className="text-muted-foreground hover:text-primary underline">
            Super User Access
          </Link>
        </div>
      </div>
    </div>
  );
}
