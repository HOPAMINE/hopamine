import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loading · Hopamine",
  description: "Playground for the Zima hexagon load transition.",
};

export default function LoadingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
