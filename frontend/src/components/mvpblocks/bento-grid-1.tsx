'use client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Brain, BarChart3, Shield, Zap, CreditCard } from 'lucide-react';

interface BentoGridItemProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const BentoGridItem = ({
  title,
  description,
  icon,
  className,
  size = 'small',
}: BentoGridItemProps) => {
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, damping: 25 },
    },
  };

  return (
    <motion.div
      variants={variants}
      className={cn(
        'group border-purple-500/20 bg-gray-900/50 hover:border-purple-400/40 relative flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-xl border px-6 pt-6 pb-10 shadow-md transition-all duration-500',
        className,
      )}
    >
      <div className="absolute top-0 -right-1/2 z-0 size-full cursor-pointer bg-[linear-gradient(to_right,#3d16165e_1px,transparent_1px),linear-gradient(to_bottom,#3d16165e_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:24px_24px]"></div>

      <div className="text-purple-500/5 group-hover:text-purple-500/10 absolute right-1 bottom-3 scale-[6] transition-all duration-700 group-hover:scale-[6.2]">
        {icon}
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div className="bg-purple-500/10 text-purple-500 shadow-purple-500/10 group-hover:bg-purple-500/20 group-hover:shadow-purple-500/20 mb-4 flex h-12 w-12 items-center justify-center rounded-full shadow transition-all duration-500">
            {icon}
          </div>
          <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">{title}</h3>
          <p className="text-gray-300 text-sm">{description}</p>
        </div>
        <div className="text-purple-500 mt-4 flex items-center text-sm">
          <span className="mr-1">Learn more</span>
          <ArrowRight className="size-4 transition-all duration-500 group-hover:translate-x-2" />
        </div>
      </div>
      <div className="from-purple-500 to-purple-500/30 absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r blur-2xl transition-all duration-500 group-hover:blur-lg" />
    </motion.div>
  );
};

const items = [
  {
    title: 'Instant Automated Payouts',
    description:
      'Sub-second USDC transfers when oracle-verified delays trigger smart contract execution. No claims forms or manual processing.',
    icon: <Zap className="size-6" />,
    size: 'large' as const,
  },
  {
    title: 'Oracle-Verified Data',
    description:
      'Switchboard oracles provide real-time, multi-source flight data with freshness checks for reliable delay verification.',
    icon: <Shield className="size-6" />,
    size: 'small' as const,
  },
  {
    title: 'Transparent On-Chain',
    description: 'All policy terms, oracle checks, and payouts are auditable on-chain. Complete transparency, zero opacity.',
    icon: <BarChart3 className="size-6" />,
    size: 'medium' as const,
  },
  {
    title: 'Community Ownership',
    description: "Democratic governance and surplus redistribution align incentives with travelers. Owned by the community.",
    icon: <Brain className="size-6" />,
    size: 'medium' as const,
  },
  {
    title: 'Seamless Checkout',
    description: 'Purchase parametric cover directly at booking. Zero friction for travelers, perfect for OTA integration.',
    icon: <CreditCard className="size-6" />,
    size: 'small' as const,
  },
  {
    title: 'Solana Powered',
    description:
      'Built on Solana for high-speed, low-cost transactions. Micro-insurance pricing makes instant micro-payouts viable.',
    icon: <Mail className="size-6" />,
    size: 'large' as const,
  },
];

export default function BentoGrid1() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {items.map((item, i) => (
          <BentoGridItem
            key={i}
            title={item.title}
            description={item.description}
            icon={item.icon}
            size={item.size}
            className={cn(
              item.size === 'large'
                ? 'col-span-4'
                : item.size === 'medium'
                  ? 'col-span-3'
                  : 'col-span-2',
              'h-full',
            )}
          />
        ))}
      </motion.div>
    </div>
  );
}
