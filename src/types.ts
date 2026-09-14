/**
 * BioPulse Pharmacovigilance Safety-Mesh
 * TypeScript Core Types
 */

export interface SymptomDetail {
  symptom: string;
  name?: string;
  meddra_soc?: string;
  soc?: string;
  severity_grade?: string;
  ctcae_grade?: string;
  is_severe?: boolean;
  confidence?: number;
  confidence_rationale?: string;
}

export interface ExtractionCertainty {
  entity: string;
  confidence: number;
  level: 'High Certainty' | 'Moderate Certainty' | 'Low Certainty';
  rationale: string;
  evidence_anchor?: string;
}

export interface ClinicalExtraction {
  drug: string;
  canonical_drug?: string;
  drug_class?: string;
  drug_confidence?: number;
  drug_confidence_rationale?: string;
  symptoms: string[];
  symptom_details?: SymptomDetail[];
  severity: 'mild' | 'moderate' | 'severe' | string;
  severity_confidence?: number;
  severity_confidence_rationale?: string;
  onset_days: number;
  onset_category?: string;
  onset_confidence?: number;
  onset_confidence_rationale?: string;
  overall_confidence?: number;
  overall_confidence_rationale?: string;
  certainties?: {
    drug?: ExtractionCertainty;
    severity?: ExtractionCertainty;
    onset?: ExtractionCertainty;
    symptoms?: ExtractionCertainty;
    overall?: ExtractionCertainty;
  };
}

export interface EvidenceReport {
  report_id: string;
  drug: string;
  reactions: string[];
  outcome: string;
  reported_date: string;
  similarity_score: number;
}

export interface EvidenceAgentResult {
  reports: EvidenceReport[];
  relevant_evidence_found: boolean;
  count: number;
}

export interface ValidationAgentResult {
  is_valid: boolean;
  retried: boolean;
  validation_notes: string;
  schema_model: string;
}

export interface FeatureBuilderResult {
  feature_vector: number[];
  feature_names: string[];
  feature_dict: Record<string, number>;
}

export interface XGBoostResult {
  risk_probability: number;
  model_version: string;
  top_contributors: Record<string, number>;
}

export interface StratificationResult {
  risk_category: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | string;
  review_status: string;
  color_tier: 'green' | 'amber' | 'red' | string;
  urgency_description: string;
}

export interface TimelineStep {
  step_id: string;
  agent_name: string;
  action: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info' | 'error';
  description: string;
  metadata?: Record<string, any> | null;
}

export interface ContributingFactor {
  name: string;
  label: string;
  feature_name?: string;
  feature_label?: string;
  value: number;
  impact_percent: number;
  contribution_percent?: number;
  direction: 'positive' | 'negative' | 'neutral' | 'increases_risk' | 'mitigates_risk';
  clinical_rationale: string;
}

export interface ClinicalExplanation {
  summary: string;
  why_risk_level: string;
  top_drivers?: string[];
  key_drivers?: string[];
  caveats?: string;
  is_summary_only?: boolean;
}

export interface MetricParameters {
  nlp_rule_concordance?: number;
  confidence_score?: number;
  agreement_description?: string;
  evidence_coverage?: number;
  evidence_coverage_percent?: number;
  evidence_coverage_description?: string;
  data_completeness?: number;
  recommended_actions: string[];
  clinical_guideline_refs?: string[];
  regulatory_guideline?: string;
}

export interface AnalyzeResponse {
  case_id: string;
  patient_name: string;
  drug_name: string;
  timestamp: string;
  clinical_extraction: ClinicalExtraction;
  evidence: EvidenceAgentResult;
  validation: ValidationAgentResult;
  features: FeatureBuilderResult;
  ml_result: XGBoostResult;
  stratification: StratificationResult;
  human_review_status: string;
  audit_timeline: TimelineStep[];
  explanation?: ClinicalExplanation;
  contributing_factors?: ContributingFactor[];
  parameters?: MetricParameters;
}

export interface CaseRecord {
  case_id: string;
  patient_name?: string;
  drug_name?: string;
  timestamp: string;
  clinical_note: string;
  extracted_data: ClinicalExtraction;
  evidence_data: EvidenceAgentResult;
  validation_status: ValidationAgentResult;
  feature_vector: number[];
  ml_risk_probability: number;
  risk_category: string;
  review_status: string;
  human_decision?: string | null;
  reviewer_note?: string | null;
  timeline: TimelineStep[];
  explanation?: ClinicalExplanation;
  contributing_factors?: ContributingFactor[];
  parameters?: MetricParameters;
}

export interface HealthStatus {
  status: string;
  service: string;
  model_loaded: boolean;
  database: string;
  total_cases_audited: number;
  timestamp: string;
}

export interface ChatSource {
  title: string;
  type: 'faers' | 'audit_db' | 'guideline' | 'active_case' | string;
  snippet: string;
  metadata?: Record<string, any> | null;
}

export interface ChatResponse {
  reply: string;
  answer?: string;
  sources: ChatSource[];
  suggested_questions?: string[];
  timestamp?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: ChatSource[];
  suggested_questions?: string[];
  isError?: boolean;
}
