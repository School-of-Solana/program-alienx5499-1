import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { PlusIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion';

const items = [
  {
    id: '1',
    title: 'How does ZYURA verify flight delays?',
    content:
      'ZYURA uses Switchboard oracles to verify flight delay data from multiple sources in real-time. The smart contracts check flight status against your policy terms and automatically trigger payouts when delay thresholds are met. All oracle checks are transparent and auditable on-chain.',
  },
  {
    id: '2',
    title: 'How fast are the payouts?',
    content:
      'Payouts are instant—typically sub-second. When oracle-verified delay data triggers your policy, smart contracts immediately transfer USDC from the risk pool to your wallet. Solana\'s high throughput enables this speed, unlike traditional insurance which takes days or weeks.',
  },
  {
    id: '3',
    title: 'Do I need to file a claim?',
    content:
      'No claims forms or paperwork required! ZYURA uses parametric insurance—payouts are automatic based on verified delay data. Once you purchase coverage, everything happens automatically when delays occur. No human adjusters, no delays.',
  },
  {
    id: '4',
    title: 'Is ZYURA secure and transparent?',
    content:
      'Yes! All policy terms, oracle checks, and payouts are on-chain and fully auditable. You can verify every aspect of your coverage. We use Solana smart contracts for deterministic execution, ensuring no manipulation or bias. Your funds are held in transparent, auditable smart contract vaults.',
  },
  {
    id: '5',
    title: 'Can I become a liquidity provider?',
    content:
      'Absolutely! Liquidity providers deposit USDC into the risk pool and receive surplus distributions. The system tracks LP shares and redistributes surplus from unused premiums back to providers. This aligns incentives—LPs earn while providing capital for traveler protection.',
  },
];

const fadeInAnimationVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.05 * index,
      duration: 0.4,
    },
  }),
};

export default function Faq1() {
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-10 text-center">
          <motion.h2
            className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Frequently Asked{' '}
            <span className="from-purple-500 bg-gradient-to-r to-cyan-500 bg-clip-text text-transparent">
              Questions
            </span>
          </motion.h2>
          <motion.p
            className="text-gray-300 mx-auto max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Everything you need to know about ZYURA and how instant, automated flight delay insurance works on Solana.
          </motion.p>
        </div>

        <motion.div
          className="relative mx-auto max-w-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Decorative gradient */}
          <div className="bg-purple-500/10 absolute -top-4 -left-4 -z-10 h-72 w-72 rounded-full blur-3xl" />
          <div className="bg-cyan-500/10 absolute -right-4 -bottom-4 -z-10 h-72 w-72 rounded-full blur-3xl" />

          <Accordion
            type="single"
            collapsible
            className="border-gray-700/40 bg-gray-900/20 w-full rounded-xl border p-2 backdrop-blur-sm"
            defaultValue="1"
          >
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                custom={index}
                variants={fadeInAnimationVariants}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
              >
                <AccordionItem
                  value={item.id}
                  className={cn(
                    'bg-gray-800/50 my-1 overflow-hidden rounded-lg border-none px-2 shadow-sm transition-all',
                    'data-[state=open]:bg-gray-800/80 data-[state=open]:shadow-md',
                  )}
                >
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger
                      className={cn(
                        'group flex flex-1 items-center justify-between gap-4 py-4 text-left text-base font-medium text-white',
                        'hover:text-purple-500 transition-all duration-300 outline-none',
                        'focus-visible:ring-purple-500/50 focus-visible:ring-2',
                        'data-[state=open]:text-purple-500',
                      )}
                    >
                      {item.title}
                      <PlusIcon
                        size={18}
                        className={cn(
                          'text-purple-500/70 shrink-0 transition-transform duration-300 ease-out',
                          'group-data-[state=open]:rotate-45',
                        )}
                        aria-hidden="true"
                      />
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent
                    className={cn(
                      'text-gray-300 overflow-hidden pt-0 pb-4',
                      'data-[state=open]:animate-accordion-down',
                      'data-[state=closed]:animate-accordion-up',
                    )}
                  >
                    <div className="border-gray-600/30 border-t pt-3">
                      {item.content}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
