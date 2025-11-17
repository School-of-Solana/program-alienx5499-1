"use client";
import React from "react";
import CardFlip from "@/components/ui/card-flip";
import { Target, Rocket } from "lucide-react";

const VisionMissionSection = () => {
  return (
    <section id="vision-mission" className="w-full py-20 px-4 bg-black">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Our Vision & Mission
          </h2>
          <p className="text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto">
            The driving force behind our commitment to revolutionizing travel insurance.
          </p>
        </div>
        <div className="flex flex-col md:flex-row justify-center items-center gap-12 max-w-6xl mx-auto">
          {/* Vision Card */}
          <CardFlip
            title="Our Vision"
            subtitle="Seamless Journeys Worldwide"
            description="To eliminate the frustration and financial uncertainty caused by flight delays by providing every traveler with fast, transparent, and fair compensation—empowering seamless journeys worldwide."
            features={["Fast Compensation", "Transparent Process", "Fair Payouts", "Global Empowerment"]}
            frontIcon={<Target className="h-6 w-6 text-white" />}
            backIcon={<Target className="h-4 w-4 text-white" />}
          />

          {/* Mission Card */}
          <CardFlip
            title="Our Mission"
            subtitle="Automated, Trustless Protection"
            description="Leverage the power of Solana's high-speed blockchain to deliver automated, trustless flight delay insurance with instant USDC payouts, removing bureaucracy and enabling fair, community-governed protection."
            features={["Solana Powered", "Automated Payouts", "Trustless System", "Community Owned"]}
            frontIcon={<Rocket className="h-6 w-6 text-white" />}
            backIcon={<Rocket className="h-4 w-4 text-white" />}
          />
        </div>
      </div>
    </section>
  );
};

export default VisionMissionSection;