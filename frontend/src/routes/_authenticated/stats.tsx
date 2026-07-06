import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/stats")({
  ssr: false,
});
