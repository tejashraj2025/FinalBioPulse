/**
 * BioPulse Pharmacovigilance Safety-Mesh
 * Main Application Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { InputScreen } from './components/InputScreen';
import { SkeletonLoader } from './components/SkeletonLoader';
import { AnalysisResults } from './components/AnalysisResults';
import { AuditLogView } from './components/AuditLogView';
import { AttackSimulator } from './components/AttackSimulator';
import { ArchitectureModal } from './components/ArchitectureModal';
import { RagChatbot } from './components/RagChatbot';
import { AnalyzeResponse, CaseRecord, HealthStatus } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'audit' | 'simulator' | 'architecture' | 'copilot'>('analyze');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<AnalyzeResponse | null>(null);
  const [hasRunAnalysis, setHasRunAnalysis] = useState<boolean>(false);
  const [clinicalNote, setClinicalNote] = useState<string>('');
  const [auditCases, setAuditCases] = useState<CaseRecord[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copilotQuery, setCopilotQuery] = useState<string | undefined>(undefined);

  // Dark mode state persisted in localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('biopulse_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('biopulse_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('biopulse_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Poll /health and /cases on mount
  const fetchHealthAndCases = useCallback(async () => {
    try {
      const healthRes = await fetch('/health');
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }

      const casesRes = await fetch('/cases');
      if (casesRes.ok) {
        const casesData = await casesRes.json();
        if (casesData.cases) {
          setAuditCases(casesData.cases);
        }
      }
    } catch (err) {
      console.warn('Backend polling warning:', err);
    }
  }, []);

  useEffect(() => {
    fetchHealthAndCases();
    const interval = setInterval(fetchHealthAndCases, 10000);
    return () => clearInterval(interval);
  }, [fetchHealthAndCases]);

  // Handle Clinical Note Analysis
  const handleAnalyze = async (clinicalNote: string, patientName?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentResult(null);

    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinical_note: clinicalNote, patient_name: patientName }),
      });

      if (!res.ok) {
        const errorDetail = await res.text();
        throw new Error(`Analysis failed (${res.status}): ${errorDetail}`);
      }

      const data: AnalyzeResponse = await res.json();
      setCurrentResult(data);
      setHasRunAnalysis(true);
      // Refresh audit cases list
      fetchHealthAndCases();
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err?.message || 'An error occurred while connecting to the safety-mesh.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Clear / Reset
  const handleReset = () => {
    setClinicalNote('');
    setCurrentResult(null);
    setHasRunAnalysis(false);
    setErrorMessage(null);
  };

  // Handle Human Review Submission
  const handleReviewSubmit = async (caseId: string, decision: string, note: string) => {
    setIsReviewing(true);
    try {
      const res = await fetch(`/cases/${caseId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reviewer_note: note,
          reviewer_name: 'Attending Safety Physician',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit review action');
      }

      const updated = await res.json();

      // Update current result state if currently showing this case
      if (currentResult && currentResult.case_id === caseId) {
        setCurrentResult({
          ...currentResult,
          human_review_status: updated.new_review_status,
          stratification: {
            ...currentResult.stratification,
            risk_category: updated.new_risk_category,
            review_status: updated.new_review_status,
          },
        });
      }

      // Refresh audit cases list
      await fetchHealthAndCases();
    } catch (err: any) {
      console.error('Review submit error:', err);
      alert(`Review submission failed: ${err.message}`);
    } finally {
      setIsReviewing(false);
    }
  };

  // Handle Attack Simulator Run
  const handleRunAttack = async (attackNote: string): Promise<AnalyzeResponse | null> => {
    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinical_note: attackNote }),
      });

      if (!res.ok) {
        throw new Error('Attack simulation request failed');
      }

      const data: AnalyzeResponse = await res.json();
      setHasRunAnalysis(true);
      await fetchHealthAndCases();
      return data;
    } catch (err) {
      console.error('Attack execution failed:', err);
      return null;
    }
  };

  const handleAskCopilot = (query?: string, caseData?: CaseRecord) => {
    if (caseData) {
      setCurrentResult({
        case_id: caseData.case_id,
        timestamp: caseData.timestamp,
        patient_name: caseData.patient_name,
        drug_name: caseData.drug_name || caseData.extracted_data?.drug,
        clinical_extraction: caseData.extracted_data,
        evidence: caseData.evidence_data,
        validation: caseData.validation_status,
        explanation: caseData.explanation,
        contributing_factors: caseData.contributing_factors,
        parameters: caseData.parameters,
        features: {
          feature_vector: caseData.feature_vector || [],
          feature_names: [
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
          ],
          feature_dict: {},
        },
        ml_result: {
          risk_probability: caseData.ml_risk_probability,
          model_version: 'BioPulse-XGBoost-v1.0',
          top_contributors: {},
        },
        stratification: {
          risk_category: caseData.risk_category,
          review_status: caseData.review_status,
          color_tier:
            caseData.risk_category === 'HIGH RISK'
              ? 'red'
              : caseData.risk_category === 'MODERATE RISK'
              ? 'amber'
              : 'green',
          urgency_description:
            caseData.risk_category === 'HIGH RISK'
              ? 'Critical hemodynamic or systemic risk factors present.'
              : caseData.risk_category === 'MODERATE RISK'
              ? 'Elevated symptom severity requiring physician queue triage.'
              : 'Minor adverse event profile with low likelihood of systemic compromise.',
        },
        human_review_status: caseData.review_status,
        audit_timeline: caseData.timeline,
      });
      setClinicalNote(caseData.clinical_note || '');
    }
    setCopilotQuery(query);
    setActiveTab('copilot');
  };

  return (
    <div className="min-h-screen bg-slate-50/90 dark:bg-[#030712] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-teal-500/20 dark:selection:bg-teal-400/25 selection:text-teal-900 dark:selection:text-teal-100 relative overflow-hidden transition-colors duration-300">
      {/* iOS Liquid Glass Ambient Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none">
        <div className="absolute -top-32 -left-28 w-[520px] h-[520px] bg-gradient-to-tr from-teal-400/20 via-emerald-400/15 to-cyan-300/10 dark:from-teal-500/15 dark:via-emerald-500/10 dark:to-cyan-400/5 rounded-full blur-[110px] animate-float-slow" />
        <div className="absolute top-1/4 -right-28 w-[580px] h-[580px] bg-gradient-to-bl from-indigo-400/18 via-purple-400/12 to-teal-300/10 dark:from-indigo-600/15 dark:via-purple-600/10 dark:to-teal-500/5 rounded-full blur-[125px] animate-float-reverse" />
        <div className="absolute -bottom-24 left-1/3 w-[480px] h-[480px] bg-gradient-to-tr from-sky-400/15 via-teal-300/12 to-emerald-400/10 dark:from-cyan-700/10 dark:via-teal-600/8 dark:to-emerald-800/5 rounded-full blur-[105px] animate-float-slow" />
      </div>

      {/* iOS Frosted Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setErrorMessage(null);
        }}
        health={health}
        casesCount={(auditCases || []).length}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        hasRunAnalysis={hasRunAnalysis}
      />

      {/* Main Content Stage */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-8 relative z-10">
        {/* Error Alert Banner if any */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            className="mb-6 p-4 rounded-2xl bg-red-50/80 dark:bg-red-950/50 backdrop-blur-xl border border-red-200/80 dark:border-red-800/80 text-red-800 dark:text-red-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg shadow-red-500/5 ios-specular"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-red-100/90 dark:bg-red-900/70 hover:bg-red-200 dark:hover:bg-red-800 text-red-900 dark:text-red-200 transition-all cursor-pointer active:scale-95"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Dynamic Tab Views with AnimatePresence */}
        <AnimatePresence mode="wait">
          {activeTab === 'analyze' && (
            <motion.div
              key="tab-analyze"
              initial={{ opacity: 0, y: 12, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              {/* Clinical Note Input Screen */}
              <InputScreen
                clinicalNote={clinicalNote}
                setClinicalNote={setClinicalNote}
                onAnalyze={handleAnalyze}
                isLoading={isLoading}
                onClear={handleReset}
              />

              {/* Execution loading OR Analysis Results (Neutral Default on load / after clear, Real Data once run) */}
              {isLoading ? (
                <SkeletonLoader />
              ) : (
                <div id="analysis-results-section" className="pt-2">
                  <AnalysisResults
                    data={currentResult}
                    onReset={handleReset}
                    onReviewSubmit={handleReviewSubmit}
                    isReviewing={isReviewing}
                    onAskCopilot={handleAskCopilot}
                  />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div
              key="tab-audit"
              initial={{ opacity: 0, y: 12, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <AuditLogView
                cases={auditCases}
                isLoading={false}
                onRefresh={fetchHealthAndCases}
                onAskCopilot={handleAskCopilot}
                onSelectCase={(c) => {
                  // Transform CaseRecord to AnalyzeResponse view
                  setCurrentResult({
                    case_id: c.case_id,
                    timestamp: c.timestamp,
                    patient_name: c.patient_name,
                    drug_name: c.drug_name || c.extracted_data?.drug,
                    clinical_extraction: c.extracted_data,
                    evidence: c.evidence_data,
                    validation: c.validation_status,
                    explanation: c.explanation,
                    contributing_factors: c.contributing_factors,
                    parameters: c.parameters,
                    features: {
                      feature_vector: c.feature_vector,
                      feature_names: [
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
                      ],
                      feature_dict: {},
                    },
                    ml_result: {
                      risk_probability: c.ml_risk_probability,
                      model_version: 'BioPulse-XGBoost-v1.0',
                      top_contributors: {},
                    },
                    stratification: {
                      risk_category: c.risk_category,
                      review_status: c.review_status,
                      color_tier:
                        c.risk_category === 'HIGH RISK'
                          ? 'red'
                          : c.risk_category === 'MODERATE RISK'
                          ? 'amber'
                          : 'green',
                      urgency_description:
                        c.risk_category === 'HIGH RISK'
                          ? 'Critical hemodynamic or systemic risk factors present.'
                          : c.risk_category === 'MODERATE RISK'
                          ? 'Elevated symptom severity requiring physician queue triage.'
                          : 'Minor adverse event profile with low likelihood of systemic compromise.',
                    },
                    human_review_status: c.review_status,
                    audit_timeline: c.timeline,
                  });
                  setClinicalNote(c.clinical_note || '');
                  setHasRunAnalysis(true);
                  setActiveTab('analyze');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'copilot' && (
            <motion.div
              key="tab-copilot"
              initial={{ opacity: 0, y: 12, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <RagChatbot
                activeCase={currentResult}
                cases={auditCases}
                initialQuery={copilotQuery}
                onClearInitialQuery={() => setCopilotQuery(undefined)}
                onSelectCase={(caseId) => {
                  const found = auditCases.find((c) => c.case_id === caseId);
                  if (found) {
                    handleAskCopilot(undefined, found);
                  }
                }}
              />
            </motion.div>
          )}

          {activeTab === 'simulator' && (
            <motion.div
              key="tab-simulator"
              initial={{ opacity: 0, y: 12, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <AttackSimulator onRunAttack={handleRunAttack} />
            </motion.div>
          )}

          {activeTab === 'architecture' && (
            <motion.div
              key="tab-architecture"
              initial={{ opacity: 0, y: 12, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <ArchitectureModal onClose={() => setActiveTab('analyze')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* iOS Liquid Glass Floating Bottom Bar */}
      <footer className="mt-auto ios-glass ios-specular border-t border-slate-200/60 dark:border-white/10 py-3.5 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50 animate-pulse" />
            <span>BioPulse Safety-Mesh</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-slate-500 dark:text-slate-400">Deterministic Pharmacovigilance Intelligence</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-400 dark:text-slate-500">
            <span className="px-2 py-0.5 rounded-md bg-white/50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">FastAPI 0.110</span>
            <span className="px-2 py-0.5 rounded-md bg-white/50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">XGBoost 3.2</span>
            <span className="px-2 py-0.5 rounded-md bg-white/50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">Pydantic v2</span>
            <span className="px-2 py-0.5 rounded-md bg-white/50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">FDA FAERS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
