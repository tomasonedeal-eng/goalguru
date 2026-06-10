import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-20 text-center text-slate-400">
          Kraunama...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
