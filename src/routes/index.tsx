import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("pb_session_token") : null;
    if (!token) throw redirect({ to: "/login" });
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
