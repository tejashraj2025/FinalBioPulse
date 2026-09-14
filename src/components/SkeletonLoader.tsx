import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Brain, Shield, Search, Cpu, Database, CheckCircle2 } from 'lucide-react';

export const SkeletonLoader: React.FC = () => {
  const steps = [
    { id: 1, label: 'NLP Agent extracting clinical entities (drug, symptoms, severity)...', icon: Brain },
    { id: 2, label: 'Validation Agent enforcing Pydantic ClinicalExtraction schema...', icon: Shield },
    { id: 3, label: 'Evidence Agent querying FAERS post-marketing surveillance signals...', icon: Search },
    { id: 4, label: 'Feature Builder compiling 12-dimensional numeric tensor vector...', icon: Cpu },
    { id: 5, label: 'XGBoost statistical inference model evaluating risk probability...', icon: Activity },
    { id: 6, label: 'Calibrating risk stratification & committing to audit database...', icon: Database },
  ];

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 450);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress Card with Liquid Glass */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="ios-glass ios-specular rounded-3xl p-6 border border-white/70 dark:border-white/10 shadow-md"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500" />
            </span>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
              Executing Safety-Mesh Pipeline...
            </h3>
          </div>
          <span className="text-xs font-mono text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20 backdrop-blur-xs">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Live Step Tracker */}
        <div className="space-y-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center gap-3 p-2.5 rounded-2xl text-xs transition-all duration-300 backdrop-blur-xs ${
                  isCurrent
                    ? 'bg-teal-500/15 text-teal-900 dark:text-teal-200 border border-teal-500/30 shadow-xs font-medium'
                    : isDone
                    ? 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-white/5'
                    : 'text-slate-400 dark:text-slate-500 opacity-50'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-pulse" />
                  ) : (
                    <Icon className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                  )}
                </div>
                <span className="flex-1 truncate">{step.label}</span>
                {isCurrent && (
                  <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 tracking-wider">
                    Processing
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Shimmering Skeleton Cards matching the incoming results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Risk Ring Skeleton */}
        <div className="md:col-span-1 ios-glass-card rounded-3xl p-6 border border-white/70 dark:border-white/10 shadow-xs flex flex-col items-center justify-center gap-4 min-h-[220px]">
          <div className="w-32 h-32 rounded-full bg-slate-200/60 dark:bg-slate-800/60 animate-pulse border border-white/40 dark:border-white/5" />
          <div className="w-24 h-4 rounded-full bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
        </div>

        {/* Entities Skeleton */}
        <div className="md:col-span-2 ios-glass-card rounded-3xl p-6 border border-white/70 dark:border-white/10 shadow-xs flex flex-col justify-between min-h-[220px]">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-28 h-7 rounded-full bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
              <div className="w-20 h-7 rounded-full bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            </div>
            <div className="w-full h-12 rounded-2xl bg-slate-200/40 dark:bg-slate-800/40 animate-pulse" />
          </div>
          <div className="flex gap-2 pt-4">
            <div className="w-20 h-6 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            <div className="w-24 h-6 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            <div className="w-16 h-6 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
