'use client';

import { motion } from 'framer-motion';
import { Calendar, Plane, DollarSign, ExternalLink } from 'lucide-react';

interface PolicyCardProps {
  policyId: number;
  status: 'Active' | 'PaidOut' | 'Expired';
  productId: number;
  flight: string;
  departureIso: string;
  premiumUsd: string;
  coverageUsd: string;
  explorerUrl: string;
  onOpen: () => void;
}

export function PolicyCard({
  policyId,
  status,
  productId,
  flight,
  departureIso,
  premiumUsd,
  coverageUsd,
  explorerUrl,
  onOpen,
}: PolicyCardProps) {
  const statusConfig = {
    Active: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: '●',
    },
    PaidOut: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      icon: '✓',
    },
    Expired: {
      bg: 'bg-gray-500/10',
      text: 'text-gray-400',
      border: 'border-gray-500/30',
      icon: '○',
    },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onOpen}
      className="group relative bg-black border border-dark-border rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-dark-border-strong hover:shadow-card-hover"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-semibold text-text-primary">
              #{policyId}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
              {config.icon} {status}
            </span>
          </div>
          <p className="text-xs text-gray-500">Product ID: {productId}</p>
        </div>
        <Plane className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 transition-colors" />
      </div>

      {/* Flight Info */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-white">{flight || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">
            {new Date(departureIso).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Financial Info */}
      <div className="grid grid-cols-2 gap-3 mb-4 pt-4 border-t border-dark-border">
        <div>
          <p className="text-xs text-gray-400 mb-1">Premium Paid</p>
          <p className="text-sm font-semibold text-white">{premiumUsd}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Coverage</p>
          <p className="text-sm font-semibold text-emerald-400">{coverageUsd}</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-dark-border">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          View Details →
        </button>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Explorer
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-indigo-500/30 transition-colors pointer-events-none" />
    </motion.div>
  );
}

