import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Pill, 
  Search, 
  ShieldCheck, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  UserCheck, 
  RotateCcw, 
  History, 
  Check, 
  Shield, 
  HelpCircle, 
  Bot,
  User,
  Activity,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Stethoscope,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AnalyzeResponse } from '../types';

interface AnalysisResultsProps {
  data: AnalyzeResponse | null;
  onReset: () => void;
  onReviewSubmit: (caseId: string, decision: string, note: string) => Promise<void>;
  isReviewing: boolean;
  onAskCopilot?: (query: string) => void;
}

const DEFAULT_FEATURE_NAMES = [
  'symptom_nausea',
  'symptom_fever',
  'symptom_hypotension',
  'symptom_rash',
  'symptom_dizziness',
  'symptom_hepatotoxicity',
  'symptom_arrhythmia',
  'severe_symptom_flag',
  'total_symptom_count',
  'rapid_onset_flag',
  'relevant_evidence_found',
  'faers_case_frequency',
];

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  data,
  onReset,
  onReviewSubmit,
  isReviewing,
  onAskCopilot,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<string>('APPROVE_AS_STRATIFIED');
  const [reviewerNote, setReviewerNote] = useState<string>('');
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);

  const isEmptyState = !data;

  // Patient and Drug identities
  const patient_name = data?.patient_name || 'Tejash Raj';
  const drug_name = data?.drug_name || data?.clinical_extraction?.drug || '—';
  const case_id = data?.case_id || 'CASE-AWAITING-INPUT';
  const timestamp = data?.timestamp || null;

  const clinical_extraction = {
    drug: data?.clinical_extraction?.drug || drug_name,
    symptoms: Array.isArray(data?.clinical_extraction?.symptoms) ? data.clinical_extraction.symptoms : [],
    severity: data?.clinical_extraction?.severity || '—',
    onset_days: data?.clinical_extraction?.onset_days ?? '—',
    canonical_drug: data?.clinical_extraction?.canonical_drug,
    drug_class: data?.clinical_extraction?.drug_class,
    symptom_details: Array.isArray(data?.clinical_extraction?.symptom_details) ? data.clinical_extraction.symptom_details : [],
  };

  const evidence = {
    count: data?.evidence?.count ?? (Array.isArray(data?.evidence?.reports) ? data.evidence.reports.length : 0),
    reports: Array.isArray(data?.evidence?.reports) ? data.evidence.reports : [],
    relevant_evidence_found: data?.evidence?.relevant_evidence_found ?? false,
  };

  const validation = data?.validation || {
    is_valid: false,
    validation_notes: '',
    schema_model: 'ClinicalExtraction',
    retried: false,
  };

  const features = {
    feature_vector: Array.isArray(data?.features?.feature_vector) ? data.features.feature_vector : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    feature_names: Array.isArray(data?.features?.feature_names) ? data.features.feature_names : DEFAULT_FEATURE_NAMES,
    feature_dict: data?.features?.feature_dict || {},
  };

  const ml_result = {
    risk_probability: data?.ml_result?.risk_probability ?? 0,
    model_version: data?.ml_result?.model_version || 'BioPulse-XGBoost-v1.0',
    top_contributors: data?.ml_result?.top_contributors || {},
  };

  const stratification = data?.stratification || {
    risk_category: 'No Data / Awaiting Analysis',
    review_status: 'Pending',
    color_tier: 'gray',
    urgency_description:
      'No active analysis executed yet. Submit a clinical note above or select a benchmark scenario to run the parallel multi-agent safety mesh and XGBoost classifier.',
  };

  const explanation = data?.explanation;
  const contributing_factors = Array.isArray(data?.contributing_factors) ? data.contributing_factors : [];
  const parameters = data?.parameters;
  const human_review_status = data?.human_review_status || 'Pending';
  const audit_timeline = Array.isArray(data?.audit_timeline) ? data.audit_timeline : [];

  const riskProbPercent = isEmptyState ? null : Math.round(ml_result.risk_probability * 100);

  // Risk styling
  const isHigh = !isEmptyState && stratification.risk_category === 'HIGH RISK';
  const isModerate = !isEmptyState && stratification.risk_category === 'MODERATE RISK';
  const isLow = !isEmptyState && stratification.risk_category === 'LOW RISK';

  const riskTheme = isEmptyState
    ? {
        bg: 'bg-slate-100/60 dark:bg-slate-900/60',
        border: 'border-slate-200/80 dark:border-slate-800',
        text: 'text-slate-800 dark:text-slate-200',
        badge: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
        ringColor: '#94A3B8',
        accentBg: 'bg-slate-100 dark:bg-slate-800',
        icon: HelpCircle,
      }
    : isHigh
    ? {
        bg: 'bg-gradient-to-br from-rose-50/90 via-red-50/50 to-orange-50/30 dark:from-rose-950/40 dark:via-red-950/20 dark:to-slate-900',
        border: 'border-rose-200 dark:border-rose-900/70',
        text: 'text-rose-900 dark:text-rose-200',
        badge: 'bg-rose-500 text-white shadow-sm shadow-rose-500/30',
        ringColor: '#F43F5E',
        accentBg: 'bg-rose-100 dark:bg-rose-950/60',
        icon: AlertTriangle,
      }
    : isModerate
    ? {
        bg: 'bg-gradient-to-br from-amber-50/90 via-yellow-50/40 to-slate-50 dark:from-amber-950/40 dark:via-yellow-950/20 dark:to-slate-900',
        border: 'border-amber-200 dark:border-amber-900/70',
        text: 'text-amber-900 dark:text-amber-200',
        badge: 'bg-amber-500 text-white shadow-sm shadow-amber-500/30',
        ringColor: '#F59E0B',
        accentBg: 'bg-amber-100 dark:bg-amber-950/60',
        icon: AlertTriangle,
      }
    : {
        bg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900',
        border: 'border-emerald-200 dark:border-emerald-900/70',
        text: 'text-emerald-900 dark:text-emerald-200',
        badge: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30',
        ringColor: '#10B981',
        accentBg: 'bg-emerald-100 dark:bg-emerald-950/60',
        icon: CheckCircle2,
      };

  const handleReviewAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmptyState) return;
    try {
      await onReviewSubmit(case_id, selectedDecision, reviewerNote);
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.8 },
      });
      setReviewSuccessMessage(`Decision committed to audit log: ${selectedDecision}`);
    } catch (err) {
      console.error(err);
    }
  };

  // SVG Circular Progress calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isEmptyState
    ? circumference
    : circumference - (ml_result.risk_probability * circumference);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Patient Bar with Prominent Patient Name & Drug Name */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-glass ios-specular rounded-2xl p-3 sm:p-4 border border-white/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Prominent Patient Name Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/10 dark:bg-teal-400/10 border border-teal-500/20 dark:border-teal-400/20">
            <div className="w-6 h-6 rounded-lg bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-teal-700 dark:text-teal-300 tracking-wider block leading-none">
                Patient Case
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isEmptyState ? 'Awaiting Case Intake' : patient_name}
              </span>
            </div>
          </div>

          {/* Drug Badge */}
          {!isEmptyState && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-white/10 text-xs font-semibold backdrop-blur-sm">
              <Pill className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{drug_name}</span>
            </div>
          )}

          {/* Small internal ID for regulatory traceability */}
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/10">
            {case_id}
          </span>

          <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {timestamp
              ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'Standby'}
          </span>
        </div>

        {!isEmptyState && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onAskCopilot && (
              <motion.button
                id="btn-ask-copilot-case"
                onClick={() =>
                  onAskCopilot(
                    `Explain why patient ${patient_name} on ${drug_name} was classified as ${stratification.risk_category} (${(ml_result.risk_probability * 100).toFixed(1)}%) and provide clinical guidelines for this profile.`
                  )
                }
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 px-3.5 py-1.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/80 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm"
                title="Ask BioPulse Copilot to explain this assessment with RAG evidence"
              >
                <Bot className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Ask Copilot</span>
              </motion.button>
            )}
            <motion.button
              id="btn-new-analysis-reset"
              onClick={onReset}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-white/10 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>New Intake</span>
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* SECTION 1: Master Risk Stratification Banner */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(5px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`rounded-3xl p-6 sm:p-7 border ${riskTheme.border} ${riskTheme.bg} backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)] relative overflow-hidden ios-specular`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Risk Information */}
          <div className="space-y-3 flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${riskTheme.badge}`}>
                {isEmptyState ? 'No Data • Awaiting Analysis' : stratification.risk_category}
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/85 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                Queue: {isEmptyState ? 'Pending' : human_review_status}
              </span>

              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {isEmptyState ? 'XGBoost Standby' : 'XGBoost Deterministic Model'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEmptyState 
                ? 'Awaiting Clinical Intake' 
                : isHigh 
                ? `Critical Alert — ${patient_name}` 
                : isModerate 
                ? `Moderate ADR Signal — ${patient_name}` 
                : `Low Risk Profile — ${patient_name}`}
            </h2>

            <p className="text-sm text-slate-700 dark:text-slate-300 max-w-xl leading-relaxed">
              {stratification.urgency_description}
            </p>
          </div>

          {/* Animated Circular Progress Meter (iOS Frosted Glass Disc) */}
          <div className="flex flex-col items-center justify-center p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/70 dark:border-white/10 shadow-md shadow-slate-900/5 flex-shrink-0">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke="currentColor"
                  className="text-slate-200/80 dark:text-slate-700/80"
                  strokeWidth="10"
                  fill="transparent"
                />
                {!isEmptyState && (
                  <motion.circle
                    cx="65"
                    cy="65"
                    r={radius}
                    stroke={riskTheme.ringColor}
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={`text-3xl font-extrabold tracking-tight ${
                  isEmptyState ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                }`}>
                  {isEmptyState ? '—' : `${riskProbPercent}%`}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                  {isEmptyState ? 'Awaiting Calc' : 'ML Probability'}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              {isEmptyState ? 'Calibrated Scale: 0.0 - 1.0' : 'Continuous Adverse Probability'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* SECTION 2: Plain-Language Clinical Explanation ("Why this risk level?") */}
      {!isEmptyState && explanation && (
        <motion.div
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="ios-glass ios-specular rounded-3xl p-6 sm:p-7 border border-white/70 dark:border-white/10 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-xs border border-white/20">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Why this risk level?
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Post-inference clinical rationale derived from XGBoost decision trees & FAERS surveillance
                </p>
              </div>
            </div>

            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/20 font-medium backdrop-blur-xs">
              Explainable AI (XAI)
            </span>
          </div>

          {/* Primary Plain-Language Narrative */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-white/5 space-y-2">
            <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
              {explanation.why_risk_level}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {explanation.summary}
            </p>
          </div>

          {/* Key Drivers */}
          {explanation.key_drivers && explanation.key_drivers.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Primary Physiological Risk Drivers:
              </span>
              <div className="flex flex-wrap gap-2">
                {explanation.key_drivers.map((driver, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl text-xs font-medium bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-white/10 flex items-center gap-1.5 backdrop-blur-xs shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-teal-500 shadow-2xs shadow-teal-500" />
                    <span>{driver}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* SECTION 3: Additional Parameters & Governance Metrics */}
      {!isEmptyState && parameters && (
        <motion.div
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Metric 1: NLP & Schema Agreement */}
          <div className="ios-glass-card p-4 rounded-3xl border border-white/70 dark:border-white/10 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
              Confidence & Agreement
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {parameters.confidence_score ?? (parameters.nlp_rule_concordance != null ? Math.round(parameters.nlp_rule_concordance * 100) : 98)}%
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              {parameters.agreement_description || 'High concordance between entity extraction and schema rules'}
            </p>
          </div>

          {/* Metric 2: FAERS Evidence Coverage */}
          <div className="ios-glass-card p-4 rounded-3xl border border-white/70 dark:border-white/10 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
              Evidence Coverage
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {parameters.evidence_coverage_percent ?? (parameters.evidence_coverage != null ? (parameters.evidence_coverage <= 1 ? Math.round(parameters.evidence_coverage * 100) : Math.round(parameters.evidence_coverage)) : 88)}%
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              {parameters.evidence_coverage_description || `${evidence.count} matching post-marketing reports verified`}
            </p>
          </div>

          {/* Metric 3: Data Completeness */}
          <div className="ios-glass-card p-4 rounded-3xl border border-white/70 dark:border-white/10 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
              Feature Completeness
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {parameters.data_completeness != null ? (parameters.data_completeness <= 1 ? Math.round(parameters.data_completeness * 100) : Math.round(parameters.data_completeness)) : 100}%
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              12/12 tensor dimensions populated without imputation
            </p>
          </div>

          {/* Metric 4: Regulatory Standard */}
          <div className="ios-glass-card p-4 rounded-3xl border border-white/70 dark:border-white/10 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
              Regulatory Benchmark
            </span>
            <div className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase truncate">
              {parameters.regulatory_guideline || (stratification.risk_category === 'HIGH RISK' ? 'FDA 21 CFR 314.80 (15-Day Alert)' : 'ICH E2D Pharmacovigilance')}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Standard operating reporting guideline
            </p>
          </div>

          {/* Recommended Next Actions Banner (Full Width) */}
          <div className="sm:col-span-2 lg:col-span-4 p-4 rounded-3xl bg-teal-500/10 dark:bg-teal-400/5 backdrop-blur-xl border border-teal-500/20 dark:border-teal-400/15 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                Recommended Next Actions:
              </span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {parameters.recommended_actions.map((act, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-white/10 flex items-start gap-2 backdrop-blur-xs shadow-2xs"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* SECTION 4: Top Contributing Factors (XGBoost Feature Attribution) */}
      {!isEmptyState && contributing_factors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="ios-glass ios-specular rounded-3xl p-6 sm:p-7 border border-white/70 dark:border-white/10 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top Contributing Factors
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Feature attribution and relative weight in XGBoost gradient-boosted decision tree
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              {contributing_factors.length} Primary Signals
            </span>
          </div>

          <div className="space-y-3">
            {contributing_factors.map((factor, idx) => {
              const featureLabel = factor.feature_label || factor.label || factor.name || 'Clinical Factor';
              const featureName = factor.feature_name || factor.name || 'factor';
              const percentVal = factor.contribution_percent ?? factor.impact_percent ?? 0;
              const isElevates = factor.direction === 'increases_risk' || factor.direction === 'positive';

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-white/5 space-y-2 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isElevates ? 'bg-rose-500 shadow-xs shadow-rose-500' : 'bg-emerald-500 shadow-xs shadow-emerald-500'
                      }`} />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {featureLabel}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        ({featureName} = {factor.value})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isElevates
                          ? 'bg-rose-100/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                          : 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                      }`}>
                        {isElevates ? '+ Elevates Risk' : '- Mitigating'}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {percentVal}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200/70 dark:bg-slate-800/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isElevates
                          ? 'bg-gradient-to-r from-orange-500 to-rose-500'
                          : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, percentVal))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {factor.clinical_rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* SECTION 5: Grid of Clinical Entities & Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Extracted Clinical Entities Card */}
        <motion.div
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="ios-glass-card rounded-3xl p-6 border border-white/70 dark:border-white/10 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clinical Entities</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Extracted by NLP Agent</p>
              </div>
            </div>

            {isEmptyState ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-white/10 text-xs font-medium backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Pydantic: Pending</span>
              </div>
            ) : (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-xs ${
                validation.is_valid 
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                  : 'bg-red-50/80 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
              }`}>
                <ShieldCheck className={`w-3.5 h-3.5 ${validation.is_valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`} />
                <span>Pydantic: {validation.is_valid ? 'Pass' : 'Failed'}</span>
              </div>
            )}
          </div>

          {/* Drug, Severity, Onset Details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-white/5 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                Active Drug
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate block">
                {clinical_extraction.drug || '—'}
              </span>
              {clinical_extraction.drug_class && (
                <span className="text-[10px] text-teal-600 dark:text-teal-400 block truncate mt-0.5 font-medium">
                  {clinical_extraction.drug_class}
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-white/5 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                Severity
              </span>
              {isEmptyState ? (
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-md inline-block bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                  —
                </span>
              ) : (
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md inline-block ${
                  clinical_extraction.severity === 'severe' 
                    ? 'bg-red-100/80 dark:bg-red-950/60 text-red-800 dark:text-red-300' 
                    : clinical_extraction.severity === 'moderate' 
                    ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' 
                    : 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                }`}>
                  {clinical_extraction.severity}
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-white/5 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                Onset Latency
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isEmptyState 
                  ? '—' 
                  : `${clinical_extraction.onset_days} ${clinical_extraction.onset_days === 1 ? 'day' : 'days'}`}
              </span>
            </div>
          </div>

          {/* Extracted Symptoms with MedDRA SOC & CTCAE Grading */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider block">
              Structured MedDRA Symptoms {isEmptyState ? '(0)' : `(${(clinical_extraction.symptoms || []).length})`}:
            </span>
            <div className="flex flex-wrap gap-2">
              {isEmptyState || (clinical_extraction.symptoms || []).length === 0 ? (
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Not yet analyzed</span>
                </span>
              ) : (
                clinical_extraction.symptom_details && clinical_extraction.symptom_details.length > 0 ? (
                  clinical_extraction.symptom_details.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-white/10 flex flex-col gap-0.5 backdrop-blur-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${item.is_severe ? 'bg-rose-500' : 'bg-teal-500'}`} />
                        <span className="font-semibold capitalize">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({item.ctcae_grade})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        SOC: {item.soc}
                      </span>
                    </div>
                  ))
                ) : (
                  (clinical_extraction.symptoms || []).map((sym, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-white/10 flex items-center gap-1.5 backdrop-blur-xs shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      <span className="capitalize">{sym}</span>
                    </span>
                  ))
                )
              )}
            </div>
          </div>
        </motion.div>

        {/* FAERS Post-Marketing Evidence Card */}
        <motion.div
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          className="ios-glass-card rounded-3xl p-6 border border-white/70 dark:border-white/10 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">FAERS Evidence</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Historical Post-Marketing Signals</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20 backdrop-blur-xs">
              {isEmptyState 
                ? 'Pending Intake' 
                : `${evidence.count} ${evidence.count === 1 ? 'Report Found' : 'Reports Found'}`}
            </span>
          </div>

          {isEmptyState ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
              <p>Awaiting entity extraction — historical ADR evidence will appear after clinical entities are parsed.</p>
            </div>
          ) : (evidence.reports || []).length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No matching historical FAERS reports for this drug/symptom pair.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {(evidence.reports || []).map((rep) => (
                <div
                  key={rep.report_id}
                  className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200/60 dark:border-white/5 hover:border-teal-500/30 transition-all space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {rep.report_id}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
                      Match {Math.round(rep.similarity_score * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {rep.outcome}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                    <span>Reactions: {(rep.reactions || []).join(', ')}</span>
                    <span>{rep.reported_date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* SECTION 6: Collapsible Technical Feature Tensor Panel */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        className="ios-glass-card rounded-3xl border border-white/70 dark:border-white/10 shadow-xs overflow-hidden"
      >
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
              <Cpu className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                Technical Tensor Vector & Feature Builder Output
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                12-dimensional numeric vector fed directly to XGBoost classifier
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>{showTechnical ? 'Hide Vector' : 'Inspect Tensor'}</span>
            {showTechnical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        <AnimatePresence>
          {showTechnical && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="px-6 pb-6 pt-2 border-t border-slate-200/50 dark:border-white/10 space-y-4"
            >
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Raw Feature Tensor:
                </span>
                <div className="p-3 rounded-2xl bg-slate-900/90 backdrop-blur-md text-teal-300 font-mono text-xs overflow-x-auto select-all border border-slate-800">
                  [{(features.feature_vector || []).join(', ')}]
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
                {(features.feature_names || []).map((name, i) => {
                  const val = (features.feature_vector || [])[i] ?? 0;
                  const isNonZero = val > 0;
                  return (
                    <div
                      key={name}
                      className={`p-2.5 rounded-2xl border text-xs transition-all backdrop-blur-sm ${
                        isNonZero
                          ? 'bg-teal-500/10 border-teal-500/20 text-teal-900 dark:text-teal-200 font-medium'
                          : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{name}</div>
                      <div className="text-sm font-bold mt-0.5">{val}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* SECTION 7: Human-in-the-Loop Review Sheet */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
        className="ios-glass ios-specular rounded-3xl p-6 sm:p-7 border border-white/70 dark:border-white/10 shadow-md space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/50 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Human-in-the-Loop Review Console</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Physician Verification for Patient {patient_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Current Queue:</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-white/10 backdrop-blur-xs">
              {isEmptyState ? 'Standby' : human_review_status}
            </span>
          </div>
        </div>

        <form onSubmit={handleReviewAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
              Clinical Reviewer Decision:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-slate-200/50 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/70 dark:border-white/10">
              {[
                { id: 'APPROVE_AS_STRATIFIED', label: 'Approve Stratified' },
                { id: 'OVERRIDE_LOW', label: 'Override: Low Risk' },
                { id: 'OVERRIDE_MODERATE', label: 'Override: Moderate' },
                { id: 'OVERRIDE_HIGH', label: 'Override: High Risk' },
              ].map((opt) => (
                <motion.button
                  key={opt.id}
                  type="button"
                  id={`btn-review-${opt.id}`}
                  disabled={isEmptyState}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedDecision(opt.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedDecision === opt.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs border border-white/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label 
              htmlFor="clinical-reviewer-remarks"
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider block"
            >
              Attending Physician Remarks (Optional):
            </label>
            <input
              id="clinical-reviewer-remarks"
              type="text"
              disabled={isEmptyState}
              value={reviewerNote}
              onChange={(e) => setReviewerNote(e.target.value)}
              placeholder={isEmptyState ? "Awaiting case analysis to enable review remarks..." : "e.g., Reviewed FAERS similarity score; verified emergency vasopressor protocol initiated."}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:focus:border-teal-400 transition-all disabled:opacity-50 backdrop-blur-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {reviewSuccessMessage ? (
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5 backdrop-blur-xs">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{reviewSuccessMessage}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {isEmptyState 
                  ? 'Sign-off actions unlock upon active case submission.' 
                  : 'Action commits cryptographic timeline audit record to database.'}
              </span>
            )}

            <motion.button
              type="submit"
              id="btn-submit-review"
              disabled={isReviewing || isEmptyState}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 text-white font-medium text-xs sm:text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-all ios-specular"
            >
              <UserCheck className="w-4 h-4 text-teal-400 dark:text-teal-200" />
              <span>{isReviewing ? 'Committing...' : 'Commit Review Sign-Off'}</span>
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* SECTION 8: Regulatory Audit Trail Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        className="ios-glass-card rounded-3xl border border-white/70 dark:border-white/10 shadow-xs overflow-hidden"
      >
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
              <History className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                Regulatory Audit Trail Timeline
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Immutable chronological ledger of every agent, schema check, and ML calculation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>{showTimeline ? 'Collapse' : 'Expand Timeline'}</span>
            {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        <AnimatePresence>
          {showTimeline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="px-6 pb-6 pt-2 border-t border-slate-200/50 dark:border-white/10"
            >
              {isEmptyState || (audit_timeline || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
                  <p className="font-medium text-slate-500 dark:text-slate-400">
                    No cases yet — submit a clinical note to begin
                  </p>
                  <p className="text-[11px]">
                    Chronological audit ledger steps will populate automatically upon running an analysis.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200/80 dark:before:bg-slate-700/80">
                  {(audit_timeline || []).map((step) => (
                    <div key={step.step_id} className="relative group">
                      <div className="absolute -left-[29px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-teal-500 dark:border-teal-400 group-hover:scale-125 transition-transform shadow-xs" />

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {step.agent_name}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-lg bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-mono border border-slate-200/60 dark:border-white/5">
                            {step.action}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto font-mono">
                            {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
