"""
BioPulse Pharmacovigilance Safety-Mesh
Data Models & Schema Enforcements

Defines the strict Pydantic clinical extraction models, pipeline event models,
and audit record structures.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ClinicalExtraction(BaseModel):
    """
    Strict extraction schema for the NLP Agent.
    Notice: No risk assessment or prognostic fields are allowed here.
    """
    drug: str = Field(..., description="The pharmaceutical or active substance identified")
    symptoms: List[str] = Field(default_factory=list, description="List of adverse reactions or clinical symptoms observed")
    severity: str = Field(..., description="Symptom severity indicator: 'mild', 'moderate', or 'severe'")
    onset_days: int = Field(..., description="Number of days from administration to symptom onset")


class AnalyzeRequest(BaseModel):
    clinical_note: str = Field(..., min_length=5, description="Raw clinical text or adverse event narrative")
    patient_name: Optional[str] = Field(None, description="Optional patient name for clinical identification")


class EvidenceReport(BaseModel):
    report_id: str
    drug: str
    reactions: List[str]
    outcome: str
    reported_date: str
    similarity_score: float


class EvidenceAgentResult(BaseModel):
    reports: List[EvidenceReport]
    relevant_evidence_found: bool
    count: int


class ValidationAgentResult(BaseModel):
    is_valid: bool
    retried: bool = False
    validation_notes: str
    schema_model: str = "ClinicalExtraction"


class FeatureBuilderResult(BaseModel):
    feature_vector: List[float]
    feature_names: List[str]
    feature_dict: Dict[str, float]


class XGBoostResult(BaseModel):
    risk_probability: float
    model_version: str = "xgboost_v1.0_synthetic_adr"
    top_contributors: Dict[str, float] = Field(default_factory=dict)


class StratificationResult(BaseModel):
    risk_category: str  # "LOW RISK", "MODERATE RISK", "HIGH RISK"
    review_status: str  # "Routine Monitoring", "Review Queue", "Immediate Clinical Review"
    color_tier: str     # "green", "amber", "red"
    urgency_description: str


class TimelineStep(BaseModel):
    step_id: str
    agent_name: str
    action: str
    timestamp: str
    status: str  # "success", "warning", "info", "error"
    description: str
    metadata: Optional[Dict[str, Any]] = None


class ReviewRequest(BaseModel):
    decision: str  # "APPROVED_AS_STRATIFIED", "OVERRIDE_LOW", "OVERRIDE_MODERATE", "OVERRIDE_HIGH"
    reviewer_note: Optional[str] = ""
    reviewer_name: Optional[str] = "Attending Safety Physician"


class FeatureContribution(BaseModel):
    feature: str
    display_name: str
    value: float
    weight: float
    impact: str  # "high", "moderate", "low"


class CaseRecord(BaseModel):
    case_id: str
    patient_name: str = "Patient Record"
    timestamp: str
    clinical_note: str
    extracted_data: ClinicalExtraction
    evidence_data: EvidenceAgentResult
    validation_status: ValidationAgentResult
    feature_vector: List[float]
    ml_risk_probability: float
    risk_category: str
    review_status: str
    human_decision: Optional[str] = None
    reviewer_note: Optional[str] = None
    timeline: List[TimelineStep]
    written_explanation: Optional[str] = None
    recommended_action: Optional[str] = None
    extraction_confidence: Optional[float] = 0.95
    evidence_coverage: Optional[float] = 0.85
    top_features: Optional[List[FeatureContribution]] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    case_id: str
    patient_name: str
    timestamp: str
    clinical_extraction: ClinicalExtraction
    evidence: EvidenceAgentResult
    validation: ValidationAgentResult
    features: FeatureBuilderResult
    ml_result: XGBoostResult
    stratification: StratificationResult
    human_review_status: str
    audit_timeline: List[TimelineStep]
    written_explanation: str
    recommended_action: str
    extraction_confidence: float
    evidence_coverage: float
    top_features: List[FeatureContribution]


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: Optional[List[ChatMessage]] = Field(default_factory=list)
    active_case: Optional[Dict[str, Any]] = None


class SourceItem(BaseModel):
    title: str
    type: str  # "faers" | "audit_db" | "guideline" | "active_case"
    snippet: str
    metadata: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str
    sources: List[SourceItem] = Field(default_factory=list)
    suggested_questions: List[str] = Field(default_factory=list)
    timestamp: str

