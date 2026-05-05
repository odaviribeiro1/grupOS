import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

type Status = "loading" | "needs-onboarding" | "ready";

export function useOnboardingStatus(): Status {
  const { user, role } = useAuth();
  const [status, setStatus] = React.useState<Status>("loading");

  React.useEffect(() => {
    let active = true;
    if (!user) {
      setStatus("loading");
      return;
    }
    // Editors skip onboarding — they use the admin's config
    if (role === "editor") {
      setStatus("ready");
      return;
    }
    supabase
      .from("uazapi_config")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const done =
          (data as { onboarding_completed?: boolean } | null)
            ?.onboarding_completed === true;
        setStatus(done ? "ready" : "needs-onboarding");
      });
    return () => {
      active = false;
    };
  }, [user, role]);

  return status;
}

export function RequireOnboarding({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = useOnboardingStatus();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-ink-400">
        Carregando…
      </div>
    );
  }
  if (status === "needs-onboarding") {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

export function RedirectIfOnboarded({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = useOnboardingStatus();
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-ink-400">
        Carregando…
      </div>
    );
  }
  if (status === "ready") {
    return <Navigate to="/grupos" replace />;
  }
  return <>{children}</>;
}
