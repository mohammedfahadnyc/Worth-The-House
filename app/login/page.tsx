import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { LoadingState } from "@/components/loading-state";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading login..." />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
