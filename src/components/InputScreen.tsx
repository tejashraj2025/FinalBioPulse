import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Upload, 
  FileText, 
  ArrowRight, 
  Info, 
  Shield,
  Trash2,
  User,
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface InputScreenProps {
  onAnalyze: (note: string, patientName?: string) => void;
  isLoading: boolean;
  clinicalNote?: string;
  setClinicalNote?: (note: string) => void;
  onClear?: () => void;
}

export interface Scenario {
  title: string;
  patientName: string;
  drug: string;
  expectedRisk: 'HIGH' | 'MODERATE' | 'LOW';
  note: string;
}

export const SAMPLE_SCENARIOS: Scenario[] = [
  {
    title: "Drug X Acute Shock",
    patientName: "Tejash Raj",
    drug: "Drug X",
    expectedRisk: "HIGH",
    note: "Patient Tejash Raj experienced severe nausea, fever and hypotension after receiving Drug X.",
  },
  {
    title: "Pembrolizumab Hepatitis",
    patientName: "Amrit Kumar Gorai",
    drug: "Pembrolizumab",
    expectedRisk: "HIGH",
    note: "62-year-old oncology patient Amrit Kumar Gorai exhibited marked hepatotoxicity, high-grade fever, and diffuse erythematous rash 2 days following an infusion of Pembrolizumab.",
  },
  {
    title: "Hydralazine Refractory Shock",
    patientName: "Tanisha Banerjee",
    drug: "Hydralazine",
    expectedRisk: "HIGH",
    note: "Emergency consult for patient Tanisha Banerjee: Manifested sudden severe hypotension, profound dizziness, and palpitations shortly after receiving intravenous Hydralazine.",
  },
  {
    title: "Metformin GI Intolerance",
    patientName: "Eleanor Vance",
    drug: "Metformin",
    expectedRisk: "MODERATE",
    note: "Patient Eleanor Vance reported recurrent nausea and abdominal discomfort 4 days after commencing dose of Metformin. No fever, no hypotension noted.",
  },
  {
    title: "Amoxicillin Mild Rash",
    patientName: "Marcus Chen",
    drug: "Amoxicillin",
    expectedRisk: "LOW",
    note: "Outpatient Marcus Chen developed mild maculopapular rash on arms 5 days into oral Amoxicillin course. Vital signs stable, no dizziness or systemic symptoms.",
  },
  {
    title: "Ciprofloxacin Arrhythmia",
    patientName: "Sofia Rodriguez",
    drug: "Ciprofloxacin",
    expectedRisk: "HIGH",
    note: "Patient Sofia Rodriguez experienced acute arrhythmia, dizziness, and mild nausea within 24 hours of receiving Ciprofloxacin. ECG demonstrated QTc prolongation.",
  }
];

export const InputScreen: React.FC<InputScreenProps> = ({ 
  onAnalyze, 
  isLoading,
  clinicalNote: propClinicalNote,
  setClinicalNote: propSetClinicalNote,
  onClear,
}) => {
  const [internalNote, setInternalNote] = useState('');
  const [patientName, setPatientName] = useState('Tejash Raj');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clinicalNote = propClinicalNote !== undefined ? propClinicalNote : internalNote;
  const setClinicalNote = propSetClinicalNote || setInternalNote;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = (clinicalNote || '').trim();
    if (!trimmed || isLoading) return;
    onAnalyze(trimmed, patientName);
  };

  const handleSelectScenario = (scen: Scenario) => {
    setClinicalNote(scen.note);
    setPatientName(scen.patientName);
    onAnalyze(scen.note, scen.patientName);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setClinicalNote(val);
    if (!val.trim() && onClear) {
      onClear();
    }
  };

  const handleClear = () => {
    setClinicalNote('');
    if (onClear) {
      onClear();
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setClinicalNote(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-7 relative">
      {/* Abstract Medical Network Graphic in Background */}
      <div className="absolute -top-16 -left-12 w-96 h-96 bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-12 -right-12 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-48 left-1/3 w-80 h-80 bg-rose-400/5 dark:bg-rose-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Hero Section with Enhanced Visual Weight */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center sm:text-left space-y-4 pt-1"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Glowing Hero Icon with Multi-Color Ambient Aura */}
          <div className="relative group flex-shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition duration-500 animate-pulse" />
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 dark:from-slate-800 dark:via-teal-900 dark:to-slate-900 border border-teal-400/40 dark:border-teal-400/50 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-teal-300 dark:text-teal-200" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-indigo-500/10 text-teal-800 dark:text-teal-200 text-xs font-semibold border border-teal-300/60 dark:border-teal-700/60 shadow-xs backdrop-blur-xs">
                <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Decoupled Safety-Mesh Architecture</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Deterministic ML • XGBoost v1.0</span>
              </span>
            </div>

            {/* Gradient Hero Text */}
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-950 via-teal-900 to-indigo-950 dark:from-white dark:via-teal-100 dark:to-slate-300 bg-clip-text text-transparent">
              Pharmacovigilance Intake & Risk Mesh
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Ingest unstructured clinical narratives. BioPulse orchestrates parallel agents for 
              entity extraction and FDA FAERS surveillance, deterministically stratified by XGBoost 
              with human-in-the-loop oversight.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Input Card with iOS Liquid Glass & Specular Highlight */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`relative ios-glass ios-specular rounded-3xl p-5 sm:p-7 border transition-all duration-300 focus-within:border-teal-500/70 focus-within:ring-4 focus-within:ring-teal-500/15 dark:focus-within:ring-teal-400/20 focus-within:shadow-[0_0_35px_rgba(20,184,166,0.18)] ${
          isDragging 
            ? 'border-teal-500 ring-4 ring-teal-500/20 dark:ring-teal-400/30' 
            : 'border-white/70 dark:border-white/10 hover:border-slate-300/80 dark:hover:border-white/20'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header Row with Colored Icon Accent & Patient Name Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-white/10">
            <div className="flex items-center gap-3">
              {/* Colored Icon Accent */}
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-sm shadow-teal-500/30 border border-white/30">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <label 
                  htmlFor="clinical-note-input"
                  className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider block"
                >
                  Clinical Narrative / Adverse Event Log
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Unstructured EHR triage, consult note, or spontaneous ADR report
                </span>
              </div>
            </div>
            
            {/* Action buttons on top right */}
            <div className="flex items-center gap-2 sm:gap-2.5 self-end sm:self-auto">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono px-2 py-0.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10">
                {(clinicalNote || '').length} chars
              </span>

              {(clinicalNote || '').trim() && (
                <motion.button
                  type="button"
                  id="btn-clear-note"
                  onClick={handleClear}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 font-medium flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200/50 dark:border-white/10 transition-colors cursor-pointer"
                  title="Clear input and reset analysis results"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Clear</span>
                </motion.button>
              )}

              <motion.button
                type="button"
                id="btn-upload-file"
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="text-xs text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 font-medium flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/70 dark:border-white/10 transition-colors shadow-2xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Upload file</span>
              </motion.button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json,.csv,.log"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Patient Identifier Field */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-2xl bg-teal-500/5 dark:bg-teal-400/5 border border-teal-500/15 dark:border-teal-400/15 backdrop-blur-md">
            <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <label htmlFor="patient-name-input" className="text-xs font-semibold whitespace-nowrap">
                Assigned Patient:
              </label>
            </div>
            <div className="flex-1 w-full sm:w-auto flex items-center gap-2">
              <input
                id="patient-name-input"
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Tejash Raj, Amrit Kumar Gorai, Tanisha Banerjee"
                className="w-full px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
              />
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Quick:</span>
              {['Tejash Raj', 'Amrit Kumar Gorai', 'Tanisha Banerjee'].map((name) => (
                <motion.button
                  key={name}
                  type="button"
                  onClick={() => setPatientName(name)}
                  whileTap={{ scale: 0.94 }}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    patientName === name
                      ? 'bg-teal-600 text-white border-teal-600 font-semibold shadow-xs shadow-teal-600/30'
                      : 'bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-white/10 hover:border-teal-400/50'
                  }`}
                >
                  {name.split(' ')[0]}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Narrative Textarea */}
          <div className="relative">
            <textarea
              id="clinical-note-input"
              rows={4}
              value={clinicalNote || ''}
              onChange={handleTextChange}
              placeholder="Paste patient clinical notes, ADR descriptions, or triage narratives here..."
              className="w-full px-4 py-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-relaxed placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500/70 dark:focus:border-teal-400/70 focus:ring-2 focus:ring-teal-500/15 transition-all resize-none font-normal shadow-inner"
            />
          </div>

          {/* Quick Scenario Picker Pills with iOS Liquid Glass Cards */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Quick Test Cases (Clinical Benchmarks):</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Click to instantly execute isolated case
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {SAMPLE_SCENARIOS.map((scen, idx) => {
                const isSelected = clinicalNote === scen.note;
                const isHigh = scen.expectedRisk === 'HIGH';
                const isMod = scen.expectedRisk === 'MODERATE';
                const isLow = scen.expectedRisk === 'LOW';

                const borderClass = isHigh
                  ? 'border-rose-300/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/25 hover:border-rose-400 dark:hover:border-rose-700 hover:bg-rose-50/80 dark:hover:bg-rose-950/40'
                  : isMod
                  ? 'border-amber-300/80 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/25 hover:border-amber-400 dark:hover:border-amber-700 hover:bg-amber-50/80 dark:hover:bg-amber-950/40'
                  : 'border-emerald-300/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/25 hover:border-emerald-400 dark:hover:border-emerald-700 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40';

                const badgeColor = isHigh
                  ? 'bg-rose-100/90 dark:bg-rose-900/70 text-rose-800 dark:text-rose-200 border-rose-300/80 dark:border-rose-700'
                  : isMod
                  ? 'bg-amber-100/90 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200 border-amber-300/80 dark:border-amber-700'
                  : 'bg-emerald-100/90 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 border-emerald-300/80 dark:border-emerald-700';

                const beaconDot = isHigh ? 'bg-rose-500 shadow-xs shadow-rose-500' : isMod ? 'bg-amber-500 shadow-xs shadow-amber-500' : 'bg-emerald-500 shadow-xs shadow-emerald-500';

                return (
                  <motion.button
                    key={idx}
                    type="button"
                    id={`sample-scenario-${idx}`}
                    onClick={() => handleSelectScenario(scen)}
                    whileHover={{ scale: 1.015, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 450, damping: 28 }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 cursor-pointer relative overflow-hidden backdrop-blur-md transition-shadow duration-200 ${
                      isSelected
                        ? 'ring-2 ring-teal-500 dark:ring-teal-400 bg-teal-50/90 dark:bg-teal-950/70 border-teal-500 dark:border-teal-400 shadow-md shadow-teal-500/10'
                        : `${borderClass} shadow-xs`
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${beaconDot}`} />
                        <span className="font-bold text-xs truncate">{scen.title}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase border flex-shrink-0 backdrop-blur-xs ${badgeColor}`}>
                        {scen.expectedRisk}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 w-full pt-1.5 border-t border-slate-200/40 dark:border-white/5">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 truncate">
                        <User className="w-3 h-3 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                        <span className="truncate">{scen.patientName}</span>
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10">
                        {scen.drug}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Bottom Controls & Action Button */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/50 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <span>
                Deterministic separation: LLM extracts entities; XGBoost computes continuous probability.
              </span>
            </div>

            {/* Pill Action Button */}
            <motion.button
              type="submit"
              id="btn-run-analysis"
              disabled={isLoading || !(clinicalNote || '').trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-r from-slate-900 via-teal-900 to-indigo-950 dark:from-teal-500 dark:via-teal-600 dark:to-indigo-600 hover:from-slate-800 hover:to-teal-800 dark:hover:from-teal-400 dark:hover:to-indigo-500 text-white font-semibold text-sm sm:text-base shadow-lg shadow-teal-800/20 dark:shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all select-none cursor-pointer border border-white/20"
            >
              <Sparkles className="w-4 h-4 text-teal-300" />
              <span>Analyze Safety-Mesh</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
