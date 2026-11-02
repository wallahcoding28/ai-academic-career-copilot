import React from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  actionText?: string;
  stageBadge?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  to,
  actionText = 'Open Module',
  stageBadge,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-6 flex flex-col justify-between shadow-subtle hover:shadow-card hover:border-slate-300 transition-all duration-200 group">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-slate-900 group-hover:text-white transition-colors">
            <Icon className="w-5 h-5" />
          </div>

          {stageBadge && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {stageBadge}
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-slate-950">
          {title}
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
          {description}
        </p>
      </div>

      <Link
        to={to}
        className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-semibold border border-slate-200 hover:border-slate-900 transition-all group/btn"
      >
        <span>{actionText}</span>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover/btn:text-white group-hover/btn:translate-x-0.5 transition-all" />
      </Link>
    </div>
  );
};
