'use client';

import { cn } from '@/lib/utils';
import { Copy, Rocket, Zap, Target, Eye, GitCommit } from 'lucide-react';
import { useState, ReactNode } from 'react';

export interface CardFlipProps {
  title?: string;
  subtitle?: string;
  description?: string;
  features?: string[];
  frontIcon?: ReactNode;
  backIcon?: ReactNode;
}

export default function CardFlip({
  title = 'Card Title',
  subtitle = 'Card Subtitle',
  description = 'This is a detailed description on the back of the card, explaining the concept further.',
  features = ['Feature One', 'Feature Two', 'Feature Three', 'Feature Four'],
  frontIcon = <Eye className="h-8 w-8 text-white" />,
  backIcon = <GitCommit className="h-5 w-5 text-white" />,
}: CardFlipProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="group relative h-[420px] w-full max-w-[360px] [perspective:2000px]"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div
        className={cn(
          'relative h-full w-full',
          '[transform-style:preserve-3d]',
          'transition-all duration-700',
          isFlipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]',
        )}
      >
        {/* Front of card */}
        <div
          className={cn(
            'absolute inset-0 h-full w-full',
            '[transform:rotateY(0deg)] [backface-visibility:hidden]',
            'overflow-hidden rounded-2xl',
            'bg-black/50 border border-white/10 backdrop-blur-md',
            '[box-shadow:0_0_0_1px_rgba(255,255,255,.06),0_10px_30px_rgba(0,0,0,.45)]',
            'transition-all duration-300',
            'group-hover:border-white/20',
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-transparent to-purple-900/30 opacity-50 group-hover:opacity-80 transition-opacity" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative flex h-[120px] w-[220px] flex-col items-center justify-center gap-2">
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    'h-20 w-20 rounded-2xl',
                    'from-blue-600 via-cyan-500 to-purple-600 bg-gradient-to-br',
                    'flex items-center justify-center',
                    'shadow-cyan-500/25 shadow-lg',
                    'animate-pulse',
                    'transition-all duration-500 group-hover:scale-110 group-hover:rotate-12',
                  )}
                >
                  {frontIcon}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 left-0 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5">
                <h3 className="text-2xl font-semibold tracking-tight text-white transition-all duration-500 ease-out group-hover:translate-y-[-4px]">
                  {title}
                </h3>
                <p className="text-md tracking-tight text-neutral-300 transition-all delay-[50ms] duration-500 ease-out group-hover:translate-y-[-4px]">
                  {subtitle}
                </p>
              </div>
              <div className="group/icon relative">
                <div
                  className={cn(
                    'absolute inset-[-8px] rounded-lg transition-opacity duration-300',
                    'from-cyan-500/20 via-cyan-500/10 bg-gradient-to-br to-transparent',
                    'opacity-0 group-hover/icon:opacity-100',
                  )}
                />
                <Zap className="text-cyan-400 relative z-10 h-6 w-6 transition-all duration-300 group-hover/icon:scale-110 group-hover/icon:rotate-12" />
              </div>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div
          className={cn(
            'absolute inset-0 h-full w-full',
            '[transform:rotateY(180deg)] [backface-visibility:hidden]',
            'rounded-2xl p-6',
            'bg-black/60 border border-white/10 backdrop-blur-lg',
            'shadow-xl shadow-black/40',
            'flex flex-col',
          )}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-900/30 via-transparent to-purple-900/30" />

          <div className="relative z-10 flex-1 space-y-5">
            <div className="space-y-3">
              <div className="mb-2 flex items-center gap-3">
                <div className="from-blue-600 to-purple-600 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br">
                  {backIcon}
                </div>
                <h3 className="text-2xl font-semibold tracking-tight text-white">
                  {title}
                </h3>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                {description}
              </p>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              {features.map((feature, index) => {
                const icons = [Copy, Rocket, Zap, Target];
                const IconComponent = icons[index % icons.length];

                return (
                  <div
                    key={feature}
                    className="flex items-center gap-3 text-sm text-neutral-200 transition-all duration-500"
                    style={{
                      transform: isFlipped ? 'translateX(0)' : 'translateX(-10px)',
                      opacity: isFlipped ? 1 : 0,
                      transitionDelay: `${index * 100 + 200}ms`,
                    }}
                  >
                    <div className="bg-cyan-500/10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md">
                      <IconComponent className="text-cyan-400 h-4 w-4" />
                    </div>
                    <span className="font-medium">{feature}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}