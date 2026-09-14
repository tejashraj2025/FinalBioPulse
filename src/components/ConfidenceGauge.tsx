import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, AlertTriangle, AlertCircle, HelpCircle, Info, Sparkles, CheckCircle2 } from 'lucide-react';
import { ExtractionCertainty } from '../types';

export interface ConfidenceGaugeProps {
  value: number; // 0 to 1 or 0 to 100
  title?: string;
  subtitle?: string;
  rationale?: string;
  variant?: 'card' | 'mini' | 'hero';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showNeedle?: boolean;
  showTicks?: boolean;
}

/**
 * Normalizes score to 0..100 percentage
 */
export function normalizeConfidence(val: number | undefined | null): number {
  if (val === undefined || val === null || isNaN(val)) return 85;
  if (val <= 1 && val > 0) return Math.round(val * 100);
  return Math.min(100, Math.max(0, Math.round(val)));
}

/**
 * Returns tier configuration based on AI certainty score
 */
export function getConfidenceTier(percentage: number) {
  if (percentage >= 85) {
    return {
      label: 'High Certainty',
      color: '#10B981', // emerald-500
      secondaryColor: '#0D9488', // teal-600
      textColor: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      borderColor: 'border-emerald-500/30 dark:border-emerald-500/20',
      badgeBg: 'bg-emerald-500 text-white',
      badgeSubtle: 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
      icon: ShieldCheck,
      description: 'AI model has validated high-concordance semantic and lexical anchors with standard medical taxonomies (RxNorm/MedDRA).',
    };
  }
  if (percentage >= 70) {
    return {
      label: 'Moderate Certainty',
      color: '#F59E0B', // amber-500
      secondaryColor: '#D97706', // amber-600
      textColor: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-500/10 dark:bg-amber-500/15',
      borderColor: 'border-amber-500/30 dark:border-amber-500/20',
      badgeBg: 'bg-amber-500 text-white',
      badgeSubtle: 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
      icon: AlertTriangle,
      description: 'Extracted using secondary syntactic patterns or heuristic clinical proxies. Human review recommended.',
    };
  }
  return {
    label: 'Low Certainty',
    color: '#F43F5E', // rose-500
    secondaryColor: '#E11D48', // rose-600
    textColor: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-500/10 dark:bg-rose-500/15',
    borderColor: 'border-rose-500/30 dark:border-rose-500/20',
    badgeBg: 'bg-rose-500 text-white',
    badgeSubtle: 'bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800',
    icon: AlertCircle,
    description: 'Uncertain or ambiguous entity mention in clinical narrative. Human pharmacovigilance sign-off required.',
  };
}

/**
 * Semi-circular Gauge Chart Component
 */
export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({
  value,
  title,
  subtitle,
  rationale,
  variant = 'card',
  size = 'md',
  className = '',
  showNeedle = true,
  showTicks = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const pct = normalizeConfidence(value);
  const tier = getConfidenceTier(pct);
  const TierIcon = tier.icon;

  // Mini variant: Compact circular or semi-circular micro gauge for symptom chips
  if (variant === 'mini') {
    const miniRadius = 14;
    const miniStroke = 3;
    const miniCircumference = 2 * Math.PI * miniRadius;
    const miniOffset = miniCircumference - (pct / 100) * miniCircumference;

    return (
      <div 
        className={`relative inline-flex items-center gap-1.5 cursor-help ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r={miniRadius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={miniStroke}
              className="text-slate-200/70 dark:text-slate-700/60"
            />
            <motion.circle
              cx="18"
              cy="18"
              r={miniRadius}
              fill="transparent"
              stroke={tier.color}
              strokeWidth={miniStroke}
              strokeDasharray={miniCircumference}
              initial={{ strokeDashoffset: miniCircumference }}
              animate={{ strokeDashoffset: miniOffset }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute font-mono text-[9px] font-bold text-slate-800 dark:text-slate-200">
            {pct}%
          </span>
        </div>

        {/* Mini Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 p-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] shadow-xl border border-slate-700/80 backdrop-blur-md pointer-events-none"
            >
              <div className="flex items-center justify-between gap-1 mb-1 font-semibold text-teal-300">
                <span className="flex items-center gap-1">
                  <TierIcon className="w-3.5 h-3.5" />
                  {tier.label} ({pct}%)
                </span>
              </div>
              <p className="text-slate-300 leading-tight">
                {rationale || tier.description}
              </p>
              <div className="w-2 h-2 bg-slate-900 dark:bg-slate-950 border-r border-b border-slate-700/80 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Dimensions for Semi-Circular Gauge
  const isHero = variant === 'hero';
  const width = isHero ? 220 : size === 'sm' ? 120 : 140;
  const height = isHero ? 130 : size === 'sm' ? 75 : 85;
  const cx = width / 2;
  const cy = height - 10;
  const r = isHero ? 80 : size === 'sm' ? 44 : 52;
  const strokeWidth = isHero ? 12 : size === 'sm' ? 8 : 9;
  
  // Total arc length of semi-circle (180 degrees)
  const arcLength = Math.PI * r;
  // Progress offset (from left to right)
  const arcOffset = arcLength * (1 - pct / 100);

  // Needle calculations (angle: 0 deg = left (0%), 180 deg = right (100%))
  const needleAngle = (pct / 100) * 180;
  const needleLength = r - (isHero ? 16 : 10);
  // In standard screen coords where 0 deg is left:
  const rad = (180 - needleAngle) * (Math.PI / 180);
  const needleX = cx + needleLength * Math.cos(rad);
  const needleY = cy - needleLength * Math.sin(rad);

  // Gradient ID unique to this instance
  const gradId = `gauge-grad-${pct}-${Math.random().toString(36).substr(2, 5)}`;

  if (variant === 'hero') {
    return (
      <div className={`ios-glass-card rounded-3xl p-5 sm:p-6 border border-white/70 dark:border-white/10 shadow-xs relative overflow-hidden ${className}`}>
        {/* Subtle background glow matching certainty */}
        <div 
          className="absolute -right-10 -top-10 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: tier.color }}
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Left Textual Overview */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs border"
              style={{ 
                backgroundColor: `${tier.color}15`, 
                borderColor: `${tier.color}40`,
                color: tier.color 
              }}
            >
              <TierIcon className="w-3.5 h-3.5" />
              <span>AI Extraction Certainty: {tier.label}</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Clinical Extraction Confidence Meter
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
              {rationale || 'Composite multi-agent NLP extraction score grounded in Medical Dictionary for Regulatory Activities (MedDRA) and RxNorm taxonomies.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>≥85% High</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>70–84% Moderate</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>&lt;70% Low</span>
              </span>
            </div>
          </div>

          {/* Right Semi-Circular Gauge */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative">
              <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                <defs>
                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={pct < 70 ? '#F43F5E' : pct < 85 ? '#F59E0B' : '#0D9488'} />
                    <stop offset="100%" stopColor={tier.color} />
                  </linearGradient>
                </defs>

                {/* Track Arc */}
                <path
                  d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-slate-200/80 dark:text-slate-800/80"
                  strokeLinecap="round"
                />

                {/* Meter Filled Arc */}
                <motion.path
                  d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                  fill="none"
                  stroke={`url(#${gradId})`}
                  strokeWidth={strokeWidth}
                  strokeDasharray={arcLength}
                  initial={{ strokeDashoffset: arcLength }}
                  animate={{ strokeDashoffset: arcOffset }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  strokeLinecap="round"
                />

                {/* Calibrated Tick Marks */}
                {showTicks && (
                  <g className="text-slate-400 dark:text-slate-500 text-[9px] font-mono">
                    <text x={cx - r - 4} y={cy + 14} textAnchor="middle">0%</text>
                    <text x={cx} y={cy - r - 6} textAnchor="middle">50%</text>
                    <text x={cx + r + 4} y={cy + 14} textAnchor="middle">100%</text>
                  </g>
                )}

                {/* Animated Needle */}
                {showNeedle && (
                  <g>
                    <motion.line
                      x1={cx}
                      y1={cy}
                      x2={needleX}
                      y2={needleY}
                      stroke={tier.color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      initial={{ x2: cx - needleLength, y2: cy }}
                      animate={{ x2: needleX, y2: needleY }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    />
                    {/* Pivot point */}
                    <circle cx={cx} cy={cy} r={6} fill="#0F172A" className="dark:fill-white" />
                    <circle cx={cx} cy={cy} r={3} fill={tier.color} />
                  </g>
                )}
              </svg>

              {/* Digital Percentage Display */}
              <div className="text-center mt-1">
                <span className="font-mono text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {pct}%
                </span>
                <span className="block text-[11px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                  Certainty Score
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card Variant: Sits directly in Active Drug, Severity, Onset Latency cards
  return (
    <div className={`flex flex-col items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-white/5 shadow-2xs relative ${className}`}>
      {/* Header with Title & Info Trigger */}
      <div className="w-full flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
          {title || 'AI Certainty'}
        </span>
        <button
          type="button"
          onClick={() => setShowTooltip(!showTooltip)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
          title="Explain extraction certainty"
        >
          <HelpCircle className="w-3 h-3" />
        </button>
      </div>

      {/* SVG Arc Gauge */}
      <div className="relative my-1">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={pct < 70 ? '#F43F5E' : pct < 85 ? '#F59E0B' : '#0D9488'} />
              <stop offset="100%" stopColor={tier.color} />
            </linearGradient>
          </defs>

          {/* Track Arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200/80 dark:text-slate-700/60"
            strokeLinecap="round"
          />

          {/* Filled Gauge Arc */}
          <motion.path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset: arcOffset }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
          />

          {/* Animated Needle */}
          {showNeedle && (
            <g>
              <motion.line
                x1={cx}
                y1={cy}
                x2={needleX}
                y2={needleY}
                stroke={tier.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                initial={{ x2: cx - needleLength, y2: cy }}
                animate={{ x2: needleX, y2: needleY }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
              <circle cx={cx} cy={cy} r={4} fill="#0F172A" className="dark:fill-white" />
              <circle cx={cx} cy={cy} r={2} fill={tier.color} />
            </g>
          )}
        </svg>

        {/* Center Percentage Display */}
        <div className="text-center -mt-1">
          <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white leading-none">
            {pct}%
          </span>
        </div>
      </div>

      {/* Certainty Level Pill */}
      <div className="w-full mt-1 flex items-center justify-center">
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs border"
          style={{
            backgroundColor: `${tier.color}15`,
            borderColor: `${tier.color}35`,
            color: tier.color,
          }}
        >
          <TierIcon className="w-2.5 h-2.5" />
          <span>{tier.label}</span>
        </span>
      </div>

      {/* Subtitle / Rationale */}
      {subtitle && (
        <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center truncate max-w-full mt-1">
          {subtitle}
        </span>
      )}

      {/* Interactive Tooltip Popover */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            className="absolute z-40 inset-x-2 bottom-2 p-3 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] shadow-2xl border border-slate-700/80 backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-1 text-teal-300 font-bold">
              <span>Certainty Rationale</span>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
                className="text-slate-400 hover:text-white p-0.5"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-300 leading-tight">
              {rationale || tier.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConfidenceGauge;
