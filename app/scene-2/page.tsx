import type { Metadata } from "next";
import CreamReveal from "@/components/CreamReveal";

export const metadata: Metadata = {
  title: "The details | You're invited",
  description: "Wipe away the frosting to uncover the invitation.",
};

export default function SceneTwo() {
  return <CreamReveal />;
}
