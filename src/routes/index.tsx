import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bylda — The call ends. The work doesn't." },
      {
        name: "description",
        content:
          "Bylda listens to every sales conversation, extracts everything that matters, updates your CRM, creates follow-ups, assigns action items, and keeps your pipeline moving automatically.",
      },
      { property: "og:title", content: "Bylda — The call ends. The work doesn't." },
      { name: "twitter:title", content: "Bylda — The call ends. The work doesn't." },
      {
        property: "og:description",
        content:
          "Every sales call, filed the moment it ends. CRM updated, follow-ups drafted, tasks assigned, pipeline moved — automatically.",
      },
      {
        name: "twitter:description",
        content:
          "Every sales call, filed the moment it ends. CRM updated, follow-ups drafted, tasks assigned, pipeline moved — automatically.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      // /app resolves the mode-aware product home (Launchpad vs Bylda).
      if (!cancelled && session) navigate({ to: "/app" });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);
  return <LandingExperience />;
}
