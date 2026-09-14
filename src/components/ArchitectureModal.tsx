import React from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  Brain, 
  Search, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Filter, 
  UserCheck, 
  Database,
  Lock
} from 'lucide-react';

interface ArchitectureModalProps {
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ onClose }) => {
  const stages = [
    {
      step: "01",
      title: "React Frontend",
      desc: "iOS-inspired frosted UI, Framer Motion springs, interactive clinical intake & review console.",
      icon: Layers,
      color: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200",
    },
    {
      step: "02",
      title: "FastAPI REST Mesh",
      desc: "High-throughput asynchronous gateway running on Python 3.11 with CORS and schema validation.",
      icon: Cpu,
      color: "bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300",
    },
    {
      step: "03",
      title: "3 Parallel Agents",
      desc: "NLP Agent (entity extraction), Evidence Agent (FAERS search), and Validation Agent (Pydantic schema enforcer).",
      icon: Brain,
      color: "bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300",
    },
    {
      step: "04",
      title: "Feature Builder",
      desc: "Encodes structured facts and FAERS signals into a 12-dimensional numerical tensor vector.",
      icon: Activity,
      color: "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300",
    },
    {
      step: "05",
      title: "XGBoost Classifier",
      desc: "Trained gradient-boosted decision trees. Calculates explainable risk probability (0.0 to 1.0).",
      icon: Activity,
      color: "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300",
    },
    {
      step: "06",
      title: "Risk Stratification",
      desc: "Calibrated deterministic boundaries: Low (0.0-0.30), Moderate (0.31-0.70), High (0.71-1.00).",
      icon: Filter,
      color: "bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300",
    },
    {
      step: "07",
      title: "Human-in-the-Loop",
      desc: "Attending clinical safety officer review queue. Approve or override risk classification.",
      icon: UserCheck,
      color: "bg-purple-50 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300",
    },
    {
      step: "08",
      title: "Audit Database",
      desc: "Immutable chronological SQLite/PostgreSQL audit store tracking every intermediate tensor.",
      icon: Database,
      color: "bg-slate-900 dark:bg-teal-900 text-teal-300",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700">
          <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>System Design & Architecture</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          BioPulse Safety-Mesh Blueprint
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Detailed technical pipeline showing how clinical intake flows from unstructured notes
          into parallel agents, deterministic feature engineering, XGBoost inference, and regulatory audit logging.
        </p>
      </div>

      {/* Non-Negotiable Directive Highlight Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="p-5 rounded-3xl bg-slate-900/90 dark:bg-slate-950/90 text-white border border-slate-800/80 shadow-lg space-y-2 backdrop-blur-xl ios-specular"
      >
        <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
          <Lock className="w-4 h-4" />
          <span>Core Pharmacovigilance Mandate: Separation of Authority</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          The LLM/NLP Agent is strictly forbidden from assessing clinical risk, assigning risk categories, 
          or diagnosing patients. Risk probabilities are <strong>exclusively computed by the deterministic XGBoost model</strong>, 
          and categorization is governed by explicit calibrated thresholds. This eliminates LLM hallucination and prompt-injection risks.
        </p>
      </motion.div>

      {/* Pipeline Stage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <motion.div
              key={stage.step}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="p-5 ios-glass-card rounded-3xl border border-white/70 dark:border-white/10 shadow-xs space-y-2 group hover:border-teal-500/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                  STAGE {stage.step}
                </span>
                <div className={`p-2 rounded-xl text-xs backdrop-blur-xs ${stage.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{stage.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{stage.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
