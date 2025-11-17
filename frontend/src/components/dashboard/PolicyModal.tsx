'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Calendar, Plane, DollarSign, FileText } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    policyId: number;
    productId: number;
    status: string;
    flight: string;
    departureIso: string;
    premiumUsd: string;
    coverageUsd: string;
    explorerUrl: string;
    metadataUrl?: string;
    imageUrl?: string;
    expectedJsonUrl?: string;
    expectedSvgUrl?: string;
  } | null;
}

export function PolicyModal({ isOpen, onClose, data }: PolicyModalProps) {
  if (!data) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-black border border-dark-border-strong rounded-2xl shadow-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
                <div className="sticky top-0 bg-black border-b border-dark-border p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    Policy #{data.policyId}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Product ID: {data.productId}</p>
                </div>
                  <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Status:</span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                    data.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    data.status === 'PaidOut' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                    'bg-gray-500/10 text-gray-400 border-gray-500/30'
                  }`}>
                    {data.status}
                  </span>
                </div>

                {/* Flight Details */}
                <div className="bg-dark-elevated/30 border border-dark-border rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Plane className="w-4 h-4 text-blue-400" />
                    Flight Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Plane className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400">Flight Number</p>
                        <p className="text-sm font-medium text-white">{data.flight || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400">Departure Time</p>
                        <p className="text-sm font-medium text-white">
                          {new Date(data.departureIso).toLocaleString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="bg-dark-elevated/30 border border-dark-border rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Financial Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400">Premium Paid</p>
                        <p className="text-sm font-semibold text-white">{data.premiumUsd}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-4 h-4 text-emerald-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400">Coverage Amount</p>
                        <p className="text-sm font-semibold text-emerald-400">{data.coverageUsd}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NFT Preview */}
                {data.imageUrl && (
                  <div className="bg-dark-elevated/30 border border-dark-border rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      Policy NFT
                    </h3>
                    <div className="bg-black rounded-lg p-2 border border-gray-700">
                      <img
                        src={data.imageUrl}
                        alt={`Policy #${data.policyId} NFT`}
                        className="w-full rounded-lg"
                        onError={(e) => {
                          // If image fails to load, try the expected SVG URL
                          const target = e.target as HTMLImageElement;
                          if (data.expectedSvgUrl && target.src !== data.expectedSvgUrl) {
                            target.src = data.expectedSvgUrl;
                          } else {
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm">NFT image not available</div>';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Links */}
                <div className="flex flex-wrap gap-3">
                  <a
                    href={data.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Explorer
                  </a>
                  {data.metadataUrl && (
                    <a
                      href={data.metadataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      View Metadata
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

