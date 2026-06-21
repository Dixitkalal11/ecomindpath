import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Leaf } from "lucide-react";

export function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Leaf className="size-6 animate-pulse text-primary" aria-label="Loading" />
      </div>
    );
  }
  return <>{children}</>;
}
