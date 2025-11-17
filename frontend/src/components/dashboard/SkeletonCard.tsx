'use client';

export function SkeletonCard() {
  return (
    <div className="bg-black border border-dark-border rounded-xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 w-20 bg-dark-elevated rounded"></div>
          <div className="h-3 w-24 bg-dark-elevated rounded"></div>
        </div>
        <div className="h-5 w-5 bg-dark-elevated rounded"></div>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="h-4 w-32 bg-dark-elevated rounded"></div>
        <div className="h-4 w-40 bg-dark-elevated rounded"></div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4 pt-4 border-t border-dark-border">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-dark-elevated rounded"></div>
          <div className="h-4 w-20 bg-dark-elevated rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-16 bg-dark-elevated rounded"></div>
          <div className="h-4 w-20 bg-dark-elevated rounded"></div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-dark-border">
        <div className="h-3 w-24 bg-dark-elevated rounded"></div>
        <div className="h-3 w-16 bg-dark-elevated rounded"></div>
      </div>
    </div>
  );
}

