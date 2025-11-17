import type { ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
  href: string;
  cta: string;
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      // fully dark theme styles
      "bg-black/50 border border-white/10 backdrop-blur-md",
      "[box-shadow:0_0_0_1px_rgba(255,255,255,.06),0_10px_30px_rgba(0,0,0,.45)]",
      "transform-gpu hover:border-white/20 hover:bg-black/60 transition-all duration-300",
      "hover:shadow-xl hover:shadow-black/40",
      className,
    )}
  >
    <div>{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-2 p-7 transition-all duration-300 group-hover:-translate-y-8">
      <Icon className="h-12 w-12 origin-left transform-gpu text-white/90 transition-all duration-300 ease-in-out group-hover:scale-90" />
      <h3 className="text-2xl font-semibold text-white">
        {name}
      </h3>
      <p className="max-w-lg text-gray-300/90">{description}</p>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
      )}
    >
      <Button variant="ghost" asChild size="sm" className="pointer-events-auto bg-white/10 hover:bg-white/15 text-white/90">
        <a href={href}>
          {cta}
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </a>
      </Button>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-white/[.05]" />
  </div>
);

export { BentoCard, BentoGrid };
