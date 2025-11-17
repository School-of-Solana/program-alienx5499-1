import {
  Mail,
  Brain,
  BarChart3,
  Shield,
  Zap,
  CreditCard,
} from 'lucide-react';

const features = [
  {
    icon: <Mail className="h-6 w-6" />,
    title: 'Gmail Integration',
    desc: 'Securely connect your Gmail account to automatically fetch and parse bank transaction emails in real-time.',
  },
  {
    icon: <Brain className="h-6 w-6" />,
    title: 'AI Categorization',
    desc: 'Advanced AI instantly categorizes your expenses: food, shopping, transport, entertainment with 95%+ accuracy.',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Live Dashboard',
    desc: 'Real-time dashboard showing monthly spend, income, budget, daily limits, and category-wise breakdowns.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Bank-Level Security',
    desc: 'Your financial data is protected with encryption and we never store your Gmail password or personal messages.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Instant Notifications',
    desc: 'Get real-time alerts when you approach budget limits or make unusual spending patterns.',
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: 'Multi-Bank Support',
    desc: 'Works with all major banks and credit cards that send transaction notifications via email.',
  },
];
export default function Feature1() {
  return (
    <section className="relative py-14">
      <div className="mx-auto max-w-screen-xl px-4 md:px-8">
        <div className="relative mx-auto max-w-2xl sm:text-center">
          <div className="relative z-10">
            <h3 className="font-geist mt-4 text-3xl font-normal tracking-tighter text-white sm:text-4xl md:text-5xl">
              Let’s help build your MVP
            </h3>
            <p className="font-geist text-gray-300 mt-3">
              Connect your Gmail and let our AI automatically categorize your expenses, track your budget, and provide real-time insights.
            </p>
          </div>
          <div
            className="absolute inset-0 mx-auto h-44 max-w-xs blur-[118px]"
            style={{
              background:
                'linear-gradient(152.92deg, rgba(192, 15, 102, 0.2) 4.54%, rgba(192, 11, 109, 0.26) 34.2%, rgba(192, 15, 102, 0.1) 77.55%)',
            }}
          ></div>
        </div>
        <hr className="bg-foreground/30 mx-auto mt-5 h-px w-1/2" />
        <div className="relative mt-12">
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item, idx) => (
              <li
                key={idx}
                className="transform-gpu space-y-3 rounded-xl border bg-transparent p-4 [box-shadow:0_-20px_80px_-20px_#8b5cf62f_inset]"
              >
                <div className="text-purple-500 w-fit transform-gpu rounded-full border p-4 [box-shadow:0_-20px_80px_-20px_#8b5cf63f_inset] dark:[box-shadow:0_-20px_80px_-20px_#8b5cf60f_inset]">
                  {item.icon}
                </div>
                <h4 className="font-geist text-lg font-bold tracking-tighter text-white">
                  {item.title}
                </h4>
                <p className="text-gray-300">{item.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
