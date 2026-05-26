import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { LoadingState } from "@/components/loading-state";

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading signup..." />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
