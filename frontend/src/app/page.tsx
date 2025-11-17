"use client";

import LandingPage from "@/components/LandingPage";
import { Navbar1 } from "@/components/ui/navbar-1";
import { DevPanel } from "@/components/ui/DevPanel";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <>
      <Navbar1 />
      <LandingPage />
      <DevPanel />
    </>
  );
}