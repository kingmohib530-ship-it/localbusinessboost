import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LocalBoost AI – Grow Your Business Instantly" },
      { name: "description", content: "Generate reviews, captions, promos & SMS messages tailored to your business in seconds." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/localboost.html"
      title="LocalBoost AI"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: "none" }}
    />
  );
}
