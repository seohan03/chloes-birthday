import type { Metadata } from "next";
import PartyDetails from "@/components/PartyDetails";

export const metadata: Metadata = { title: "RSVP | Chloe’s Birthday" };

export default function SceneThree() {
  return <PartyDetails />;
}
