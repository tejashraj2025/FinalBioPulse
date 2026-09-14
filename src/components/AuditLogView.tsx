import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Search, 
  Download, 
  Filter, 
  Clock, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  X,
  FileText,
  Shield,
  Activity,
  RotateCcw,
  Bot,
  User,
  Pill,
  TrendingUp,
  Stethoscope
} from 'lucide-react';
import { CaseRecord } from '../types';
import { RiskDistributionChart } from './RiskDistributionChart';

interface AuditLogViewProps {
  cases: CaseRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectCase: (caseItem: CaseRecord) => void;
  onAskCopilot?: (query: string, caseData?: CaseRecord) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  cases,
  isLoading,
  onRefresh,
  onSelectCase,
  onAskCopilot,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH RISK' | 'MODERATE RISK' | 'LOW RISK'>('ALL');
  const [selectedModalCase, setSelectedModalCase] = useState<CaseRecord | null>(null);

  const safeCases = Array.isArray(cases) ? cases : [];

  // Filter cases
  const filteredCases = safeCases.filter((c) => {
    const matchesRisk = riskFilter === 'ALL' || c.risk_category === riskFilter;
    const q = searchQuery.toLowerCase();
    const symptoms = Array.isArray(c.extracted_data?.symptoms) ? c.extracted_data.symptoms : [];
    const drug = c.extracted_data?.drug || '';
    const note = c.clinical_note || '';
    const caseId = c.case_id || '';

    const matchesSearch =
      !q ||
      caseId.toLowerCase().includes(q) ||
      drug.toLowerCase().includes(q) ||
      note.toLowerCase().includes(q) ||
      symptoms.some((s) => (s || '').toLowerCase().includes(q));

    return matchesRisk && matchesSearch;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (safeCases.length === 0) return;
    const headers = [
      'Case ID',
      'Timestamp',
      'Drug',
      'Symptoms',
      'Severity',
      'Onset Days',
      'FAERS Evidence Count',
      'Validation Status',
      'ML Risk Probability',
      'Risk Category',
      'Review Status',
      'Human Decision',
      'Clinical Note',
    ];

    const rows = safeCases.map((c) => {
      const drug = (c.extracted_data?.drug || '').replace(/"/g, '""');
      const symptoms = Array.isArray(c.extracted_data?.symptoms) ? c.extracted_data.symptoms.join('; ') : '';
      const clinicalNote = (c.clinical_note || '').replace(/"/g, '""');
      return [
        c.case_id || '',
        c.timestamp || '',
        `"${drug}"`,
        `"${symptoms}"`,
        c.extracted_data?.severity || '—',
        c.extracted_data?.onset_days ?? '—',
        c.evidence_data?.count ?? 0,
        c.validation_status?.is_valid ? 'VALID' : 'INVALID',
        (c.ml_risk_probability ?? 0).toFixed(4),
        c.risk_category || '',
        `"${c.review_status || ''}"`,
        `"${c.human_decision || 'Pending'}"`,
        `"${clinicalNote}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `biopulse_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700">
            <Database className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>SQLite Audit Database</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Regulatory Audit Log & Review History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Cryptographically timestamped ledger of every pharmacovigilance intake, vector, ML score, and physician review.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/70 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Refresh</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={handleExportCSV}
            disabled={safeCases.length === 0}
            className="px-4 py-2 rounded-2xl bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 text-white text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ios-specular"
          >
            <Download className="w-3.5 h-3.5 text-teal-400 dark:text-teal-200" />
            <span>Export CSV</span>
          </motion.button>
        </div>
      </div>

      {/* D3.js Risk Category Longitudinal Distribution Chart */}
      <RiskDistributionChart cases={safeCases} />

      {/* Filter & Search Bar */}
      <div className="p-4 ios-glass-card rounded-3xl border border-white/70 dark:border-white/10 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, drug, symptom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-white/10 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:focus:border-teal-400 transition-all backdrop-blur-xs"
          />
        </div>

        {/* Risk Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'HIGH RISK', 'MODERATE RISK', 'LOW RISK'] as const).map((cat) => (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.96 }}
              onClick={() => setRiskFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                riskFilter === cat
                  ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-xs border border-white/20'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/50 dark:border-white/5'
              }`}
            >
              {cat === 'ALL' ? 'All Tiers' : cat}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cases List */}
      {filteredCases.length === 0 ? (
        <div className="p-12 text-center ios-glass-card rounded-3xl border border-white/70 dark:border-white/10 space-y-3 shadow-xs">
          <Database className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {safeCases.length === 0 ? 'No cases yet — submit a clinical note to begin' : 'No Matching Cases Found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {safeCases.length === 0
              ? 'Submit a clinical note in the Analyze tab to execute parallel safety agents and persist cryptographic records.'
              : 'Try resetting your search query or tier filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((c) => {
            const isHigh = c.risk_category === 'HIGH RISK';
            const isMod = c.risk_category === 'MODERATE RISK';
            const badgeColor = isHigh
              ? 'bg-red-100/80 dark:bg-red-950/70 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
              : isMod
              ? 'bg-amber-100/80 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              : 'bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

            return (
              <motion.div
                key={c.case_id}
                layout
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedModalCase(c)}
                className="p-5 ios-glass-card rounded-3xl border border-white/70 dark:border-white/10 hover:border-teal-500/40 dark:hover:border-teal-400/40 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                {/* Left info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-extrabold text-sm">
                      <div className="w-5 h-5 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center text-[10px] shadow-2xs">
                        <User className="w-3 h-3" />
                      </div>
                      <span>{c.patient_name || 'Patient Case'}</span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-xs ${badgeColor}`}>
                      {c.risk_category}
                    </span>

                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-slate-200/60 dark:border-white/10 backdrop-blur-xs">
                      <Pill className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      <span>{c.extracted_data?.drug || c.drug_name || '—'}</span>
                    </span>

                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {c.case_id}
                    </span>

                    {c.human_decision && (
                      <span className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-xs">
                        <UserCheck className="w-3 h-3" />
                        <span>{c.human_decision}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                    "{c.clinical_note}"
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>Symptoms: {(c.extracted_data?.symptoms || []).join(', ') || 'None'}</span>
                    <span>•</span>
                    <span>Severity: {c.extracted_data?.severity || '—'}</span>
                    <span>•</span>
                    <span>FAERS Matches: {c.evidence_data?.count ?? 0}</span>
                  </div>
                </div>

                {/* Right risk metrics & button */}
                <div className="flex items-center gap-4 self-end md:self-auto">
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {Math.round(c.ml_risk_probability * 100)}%
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      XGBoost Score
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-white/10 group-hover:bg-slate-900 dark:group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors shadow-2xs">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Case Detail Modal */}
      <AnimatePresence>
        {selectedModalCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl ios-glass ios-specular rounded-3xl p-6 sm:p-7 border border-white/80 dark:border-white/10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>{selectedModalCase.patient_name || 'Patient Case'}</span>
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {selectedModalCase.extracted_data?.drug || selectedModalCase.drug_name || '—'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                    Audit Ref: {selectedModalCase.case_id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedModalCase(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Plain-Language Explanation if present */}
              {selectedModalCase.explanation && (
                <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 dark:text-teal-200">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Why this risk level?</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedModalCase.explanation.why_risk_level}
                  </p>
                </div>
              )}

              {/* Note */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Raw Clinical Note
                </span>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 leading-relaxed font-mono">
                  "{selectedModalCase.clinical_note}"
                </p>
              </div>

              {/* Extraction Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-xs">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Drug</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedModalCase.extracted_data?.drug || '—'}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-xs">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Severity</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedModalCase.extracted_data?.severity || '—'}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-xs">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Onset</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedModalCase.extracted_data?.onset_days ?? '—'}d</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-xs">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">ML Probability</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{Math.round((selectedModalCase.ml_risk_probability ?? 0) * 100)}%</div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Case Timeline History
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(selectedModalCase.timeline || []).map((step, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-xs space-y-0.5">
                      <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                        <span>{step.agent_name} - {step.action}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {new Date(step.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectCase(selectedModalCase);
                      setSelectedModalCase(null);
                    }}
                    className="px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/80 transition-colors cursor-pointer"
                  >
                    Load in Analyze View
                  </button>

                  {onAskCopilot && (
                    <button
                      onClick={() => {
                        onAskCopilot(
                          `Explain why audit case ${selectedModalCase.case_id} (${selectedModalCase.extracted_data?.drug || 'Drug'}) was stratified as ${selectedModalCase.risk_category} (${Math.round((selectedModalCase.ml_risk_probability ?? 0) * 100)}%) and cite relevant FAERS signals.`,
                          selectedModalCase
                        );
                        setSelectedModalCase(null);
                      }}
                      className="px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Consult BioPulse Copilot about this case"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Ask Copilot</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedModalCase(null)}
                  className="px-5 py-2 rounded-full bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-teal-500 transition-colors cursor-pointer"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
