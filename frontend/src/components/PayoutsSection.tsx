"use client";
import React from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ShieldCheck } from "lucide-react";

const payoutTiers = [
  { delay: "> 2 Hours", payout: "8%" },
  { delay: "> 3 Hours", payout: "16%" },
  { delay: "> 5 Hours", payout: "33%" },
  { delay: "> 12 Hours", payout: "45%" },
  { delay: "> 24 Hours", payout: "65%" },
];

// A small, self-contained component for the payout cards
const PayoutTierCard = ({ tier }: { tier: { delay: string; payout: string } }) => {
  return (
    <div
      className="relative p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 text-center cursor-pointer group"
    >
      <p className="text-neutral-300 text-md mb-1 transition-colors group-hover:text-white">{tier.delay}</p>
      <p className="text-3xl font-bold text-purple-300 transition-colors group-hover:text-purple-200" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {tier.payout}
      </p>
    </div>
  );
};

const PayoutsSection = () => {
  return (
    <section id="payouts" className="w-full py-20 px-4 bg-black">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Payouts & Pricing
          </h2>
          <p className="text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto">
            Fair, transparent, and automated. Understand exactly how you&apos;re compensated.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Key Points Card */}
          <div className="relative col-span-1 flex flex-col h-full overflow-hidden rounded-xl bg-black/50 border border-white/10 backdrop-blur-md [box-shadow:0_0_0_1px_rgba(255,255,255,.06),0_10px_30px_rgba(0,0,0,.45)] transition-all duration-300 hover:border-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-transparent to-purple-900/30 opacity-50 group-hover:opacity-80 transition-opacity" />
            <div className="relative p-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="flex items-center gap-3 text-2xl text-cyan-300">
                  <ShieldCheck className="h-7 w-7" />
                  Our Promise
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="space-y-4 text-lg">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <span className="text-neutral-200">Transparent Tiered Pricing Model</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <span className="text-neutral-200">One-Time Purchase, No Surprises</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <span className="text-neutral-200">Blockchain Savings Passed to You</span>
                  </li>
                   <li className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <span className="text-neutral-200">Multiple Payment Methods</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <span className="text-neutral-200">Guaranteed Payouts via Smart Contract</span>
                  </li>
                </ul>
              </CardContent>
            </div>
          </div>

          {/* Payout Tier Card */}
          <div className="relative col-span-1 flex flex-col h-full overflow-hidden rounded-xl bg-black/50 border border-white/10 backdrop-blur-md [box-shadow:0_0_0_1px_rgba(255,255,255,.06),0_10px_30px_rgba(0,0,0,.45)] transition-all duration-300 hover:border-white/20">
             <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-cyan-900/30 opacity-50 group-hover:opacity-80 transition-opacity" />
            <div className="relative p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-2xl text-purple-300">Payout Tier Information</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {payoutTiers.map((tier, index) => (
                    <PayoutTierCard key={index} tier={tier} />
                  ))}
                </div>
              </CardContent>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PayoutsSection;