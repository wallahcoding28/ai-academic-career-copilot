import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'planned' | 'offline' | 'stage';
  text?: string;
  stageNumber?: number;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  stageNumber,
  className = '',
}) => {
  if (status === 'stage' && stageNumber) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80 ${className}`}>
        {text || `Module ${stageNumber}`}
      </span>
    );
  }

  if (status === 'active') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {text || 'Active'}
      </span>
    );
  }

  if (status === 'planned') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        {text || 'Coming Soon'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
      {text || 'Offline'}
    </span>
  );
};
