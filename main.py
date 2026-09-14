"""
BioPulse Pharmacovigilance Safety-Mesh
FastAPI Backend Application

Endpoints:
- POST /analyze : Orchestrates 3 parallel agents, feature engineering, XGBoost ML,
                  risk stratification, and audit logging.
- GET  /cases   : Retrieves past pharmacovigilance cases from the audit database.
- POST /cases/{case_id}/review : Human-in-the-loop clinical approval or override.
- GET  /health  : Service health, model status, and database metrics.
- POST /attack-simulate : Safety mesh adversarial injection test.
"""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
import asyncio
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import xgboost as xgb

from models import (
    AnalyzeRequest,
    AnalyzeResponse,
    CaseRecord,
    ClinicalExtraction,
    EvidenceAgentResult,
    EvidenceReport,
    FeatureBuilderResult,
    ReviewRequest,
    StratificationResult,
    TimelineStep,
    ValidationAgentResult,
    XGBoostResult,
    ChatRequest,
    ChatResponse,
    FeatureContribution,
)
from agents import (
    run_nlp_agent,
    run_evidence_agent,
    run_validation_agent,
    build_feature_vector,
    stratify_risk,
    FEATURE_NAMES,
    resolve_patient_name,
    calculate_feature_contributions,
    calculate_quality_metrics,
    generate_written_explanation,
    get_recommended_action,
    client as prism_client,
)
from rag import execute_rag_pipeline, generate_follow_up_suggestions

# Initialize FastAPI App
app = FastAPI(
    title="BioPulse Pharmacovigilance Safety-Mesh API",
    description="Decoupled LLM-clinical agent & deterministic XGBoost risk engine.",
    version="1.0.0",
)

# Enable CORS for React frontend (Vite dev server, container origins, local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Setup (SQLite local fallback, compliant with Supabase/PostgreSQL schema)
DB_PATH = "biopulse_audit.db"


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_cases (
            case_id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            clinical_note TEXT NOT NULL,
            drug TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            severity TEXT NOT NULL,
            onset_days INTEGER NOT NULL,
            evidence_count INTEGER NOT NULL,
            evidence_json TEXT NOT NULL,
            validation_status TEXT NOT NULL,
            validation_notes TEXT NOT NULL,
            feature_vector TEXT NOT NULL,
            ml_risk_probability REAL NOT NULL,
            risk_category TEXT NOT NULL,
            review_status TEXT NOT NULL,
            human_decision TEXT,
            reviewer_note TEXT,
            timeline_json TEXT NOT NULL,
            patient_name TEXT,
            written_explanation TEXT,
            recommended_action TEXT,
            extraction_confidence REAL,
            evidence_coverage REAL,
            top_features_json TEXT
        )
    """)
    # Add new columns if missing from existing table
    existing_cols = [row[1] for row in cursor.execute("PRAGMA table_info(audit_cases)").fetchall()]
    new_cols = [
        ("patient_name", "TEXT DEFAULT 'Patient Record'"),
        ("written_explanation", "TEXT"),
        ("recommended_action", "TEXT"),
        ("extraction_confidence", "REAL DEFAULT 0.95"),
        ("evidence_coverage", "REAL DEFAULT 0.85"),
        ("top_features_json", "TEXT"),
    ]
    for col_name, col_type in new_cols:
        if col_name not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE audit_cases ADD COLUMN {col_name} {col_type}")
            except Exception:
                pass
    conn.commit()
    conn.close()


init_db()

# Load XGBoost Model
MODEL_PATH = "xgboost_model.json"
xgb_model = None

def load_ml_model():
    global xgb_model
    if os.path.exists(MODEL_PATH):
        try:
            booster = xgb.Booster()
            booster.load_model(MODEL_PATH)
            xgb_model = booster
            print(f"[BioPulse] Successfully loaded XGBoost model from {MODEL_PATH}")
        except Exception as e:
            print(f"[BioPulse] Error loading XGBoost model: {e}")
    else:
        print(f"[BioPulse] Warning: {MODEL_PATH} not found. Running training script...")
        from train_model import train_and_save_model
        train_and_save_model(MODEL_PATH)
        booster = xgb.Booster()
        booster.load_model(MODEL_PATH)
        xgb_model = booster


load_ml_model()


def get_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


# =========================================================================
# API ENDPOINTS
# =========================================================================

@app.get("/health")
async def health_check():
    conn = get_db_connection()
    count = conn.execute("SELECT COUNT(*) FROM audit_cases").fetchone()[0]
    conn.close()
    return {
        "status": "healthy",
        "service": "BioPulse Pharmacovigilance Safety-Mesh",
        "model_loaded": xgb_model is not None,
        "database": "SQLite (Durable Local Audit Store)",
        "total_cases_audited": count,
        "timestamp": get_iso_now(),
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_clinical_case(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Primary safety mesh pipeline:
    1. Agent Ingestion & Dispatch
    2. Parallel execution: NLP Agent (structured entity extraction) & preliminary Evidence Scanner
    3. Validation Agent: Strict Pydantic ClinicalExtraction schema check (+ retry if needed)
    4. Evidence Agent: FAERS historical cross-referencing
    5. Feature Builder: Deterministic 12-dim numeric vector encoder
    6. XGBoost Inference: Statistical risk probability calculation (0.0 - 1.0)
    7. Risk Stratification: Calibrated category & Review Queue routing
    8. Human-in-the-Loop assignment
    9. Audit Trail logging to database
    """
    case_id = f"BP-{datetime.now().strftime('%y%m')}-{uuid.uuid4().hex[:6].upper()}"
    patient_name = resolve_patient_name(request.clinical_note, request.patient_name)
    start_ts = get_iso_now()
    timeline: List[TimelineStep] = []

    # Timeline 1: Ingestion
    timeline.append(TimelineStep(
        step_id="1_INGEST",
        agent_name="Ingestion Gateway",
        action="Ingest Clinical Narrative",
        timestamp=start_ts,
        status="success",
        description=f"Received narrative for patient {patient_name} ({len(request.clinical_note)} chars). Assigned safety mesh ID: {case_id}.",
        metadata={"patient_name": patient_name, "case_id": case_id},
    ))

    # Parallel Agent Execution: NLP Extraction + Preliminary Evidence Pre-fetch
    # NOTE: NLP Agent is strictly constrained to extract clinical entities only.
    nlp_task = asyncio.create_task(run_nlp_agent(request.clinical_note, case_id=case_id))
    evidence_task = asyncio.create_task(run_evidence_agent("", ["nausea", "hypotension", "fever", "rash"], case_id=case_id))

    raw_nlp_result, _ = await asyncio.gather(nlp_task, evidence_task)

    timeline.append(TimelineStep(
        step_id="2_NLP_EXTRACT",
        agent_name="NLP Agent",
        action="Extract Structured Clinical Facts",
        timestamp=get_iso_now(),
        status="success",
        description="Structured entities parsed without assigning clinical risk or prognosis.",
        metadata={"raw_extraction": raw_nlp_result},
    ))

    # Validation Agent
    validated_extraction, validation_result = await run_validation_agent(raw_nlp_result, request.clinical_note, case_id=case_id)

    timeline.append(TimelineStep(
        step_id="3_VALIDATION",
        agent_name="Validation Agent",
        action="Enforce Pydantic ClinicalExtraction Schema",
        timestamp=get_iso_now(),
        status="success" if validation_result.is_valid else "warning",
        description=validation_result.validation_notes,
        metadata={"retried": validation_result.retried, "schema": validation_result.schema_model},
    ))

    # Evidence Agent (query FAERS with the validated drug and symptoms)
    evidence_result = await run_evidence_agent(
        drug=validated_extraction.drug,
        symptoms=validated_extraction.symptoms,
        case_id=case_id,
    )

    timeline.append(TimelineStep(
        step_id="4_EVIDENCE",
        agent_name="Evidence Agent",
        action="Cross-Reference FAERS Database",
        timestamp=get_iso_now(),
        status="success" if evidence_result.relevant_evidence_found else "info",
        description=f"FAERS retrieval completed: {evidence_result.count} matching historical ADR reports identified.",
        metadata={"matches_found": evidence_result.count},
    ))

    # Feature Builder
    features_result = build_feature_vector(validated_extraction, evidence_result)

    timeline.append(TimelineStep(
        step_id="5_FEATURE_BUILDER",
        agent_name="Feature Builder",
        action="Construct 12-Dimensional Numeric Vector",
        timestamp=get_iso_now(),
        status="success",
        description="Normalized symptom flags, severity index, onset latency, and FAERS signal frequency into tensor format.",
        metadata={"vector": features_result.feature_vector},
    ))

    # XGBoost ML Model Inference
    # IMPORTANT: The ML model, NOT the LLM, produces this continuous probability.
    global xgb_model
    if xgb_model is None:
        load_ml_model()

    input_vector = np.array([features_result.feature_vector], dtype=np.float32)
    dmatrix = xgb.DMatrix(input_vector, feature_names=FEATURE_NAMES)
    preds = xgb_model.predict(dmatrix)
    risk_prob = float(preds[0])

    # Top contributors for explainability
    contributors = {}
    for name, val in features_result.feature_dict.items():
        if val > 0:
            contributors[name] = float(val)

    ml_result = XGBoostResult(
        risk_probability=round(risk_prob, 4),
        model_version="BioPulse-XGBoost-v1.0",
        top_contributors=contributors,
    )

    timeline.append(TimelineStep(
        step_id="6_XGBOOST_INFERENCE",
        agent_name="XGBoost Classifier",
        action="Compute Deterministic Risk Probability",
        timestamp=get_iso_now(),
        status="success",
        description=f"Inference yielded continuous adverse probability: {risk_prob:.1%}. Fully explainable gradient-boosted decision tree.",
        metadata={"probability": round(risk_prob, 4)},
    ))

    # Risk Stratification Engine
    stratification = stratify_risk(risk_prob)

    timeline.append(TimelineStep(
        step_id="7_STRATIFICATION",
        agent_name="Risk Stratification Engine",
        action="Map Score to Clinical Tiers",
        timestamp=get_iso_now(),
        status="success",
        description=f"Assigned tier: {stratification.risk_category} -> Status: {stratification.review_status}.",
        metadata={"tier": stratification.risk_category, "review_status": stratification.review_status},
    ))

    # Human-in-the-Loop Queue Assignment
    timeline.append(TimelineStep(
        step_id="8_HITL_QUEUE",
        agent_name="Human-in-the-Loop Gateway",
        action="Route to Clinical Review Queue",
        timestamp=get_iso_now(),
        status="info",
        description=f"Enqueued under '{stratification.review_status}'. Awaiting attending physician audit and sign-off.",
    ))

    # Compute explanation, recommendations, and quality metrics
    top_features = calculate_feature_contributions(features_result, risk_prob)
    conf, cov = calculate_quality_metrics(validation_result, validated_extraction, evidence_result)
    explanation = generate_written_explanation(
        patient_name=patient_name,
        drug=validated_extraction.drug,
        symptoms=validated_extraction.symptoms,
        severity=validated_extraction.severity,
        onset_days=validated_extraction.onset_days,
        risk_category=stratification.risk_category,
        risk_prob=risk_prob,
        evidence_count=evidence_result.count,
        relevant_evidence_found=evidence_result.relevant_evidence_found,
        top_features=top_features,
    )
    rec_action = get_recommended_action(stratification.risk_category, validated_extraction.drug, validated_extraction.symptoms)

    # Write to Audit Database (SQLite)
    try:
        conn = get_db_connection()
        conn.execute("""
            INSERT INTO audit_cases (
                case_id, timestamp, clinical_note, drug, symptoms, severity, onset_days,
                evidence_count, evidence_json, validation_status, validation_notes,
                feature_vector, ml_risk_probability, risk_category, review_status,
                human_decision, reviewer_note, timeline_json,
                patient_name, written_explanation, recommended_action,
                extraction_confidence, evidence_coverage, top_features_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            case_id,
            start_ts,
            request.clinical_note,
            validated_extraction.drug,
            json.dumps(validated_extraction.symptoms),
            validated_extraction.severity,
            validated_extraction.onset_days,
            evidence_result.count,
            json.dumps([r.dict() for r in evidence_result.reports]),
            "VALID" if validation_result.is_valid else "INVALID",
            validation_result.validation_notes,
            json.dumps(features_result.feature_vector),
            risk_prob,
            stratification.risk_category,
            stratification.review_status,
            None,
            None,
            json.dumps([t.dict() for t in timeline]),
            patient_name,
            explanation,
            rec_action,
            conf,
            cov,
            json.dumps([f.dict() for f in top_features]),
        ))
        conn.commit()
        conn.close()
    except Exception as db_err:
        print(f"[BioPulse DB Error] Failed to persist audit case: {db_err}")

    # Ensure PRISM trace transmission runs non-blockingly in background
    background_tasks.add_task(prism_client.flush)

    return AnalyzeResponse(
        case_id=case_id,
        patient_name=patient_name,
        timestamp=start_ts,
        clinical_extraction=validated_extraction,
        evidence=evidence_result,
        validation=validation_result,
        features=features_result,
        ml_result=ml_result,
        stratification=stratification,
        human_review_status=stratification.review_status,
        audit_timeline=timeline,
        written_explanation=explanation,
        recommended_action=rec_action,
        extraction_confidence=conf,
        evidence_coverage=cov,
        top_features=top_features,
    )


@app.get("/cases")
async def list_cases():
    """
    Retrieves all past cases from the audit database for the Audit Log tab.
    """
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM audit_cases ORDER BY timestamp DESC").fetchall()
    conn.close()

    cases = []
    for r in rows:
        try:
            symptoms = json.loads(r["symptoms"])
            evidence_reports = [EvidenceReport(**x) for x in json.loads(r["evidence_json"])]
            feature_vector = json.loads(r["feature_vector"])
            timeline_list = [TimelineStep(**x) for x in json.loads(r["timeline_json"])]

            cases.append(CaseRecord(
                case_id=r["case_id"],
                timestamp=r["timestamp"],
                clinical_note=r["clinical_note"],
                extracted_data=ClinicalExtraction(
                    drug=r["drug"],
                    symptoms=symptoms,
                    severity=r["severity"],
                    onset_days=r["onset_days"],
                ),
                evidence_data=EvidenceAgentResult(
                    reports=evidence_reports,
                    relevant_evidence_found=r["evidence_count"] > 0,
                    count=r["evidence_count"],
                ),
                validation_status=ValidationAgentResult(
                    is_valid=(r["validation_status"] == "VALID"),
                    retried=False,
                    validation_notes=r["validation_notes"],
                ),
                feature_vector=feature_vector,
                ml_risk_probability=r["ml_risk_probability"],
                risk_category=r["risk_category"],
                review_status=r["review_status"],
                human_decision=r["human_decision"],
                reviewer_note=r["reviewer_note"],
                timeline=timeline_list,
            ))
        except Exception as e:
            print(f"Error parsing case row: {e}")
            continue

    return {"cases": cases, "total": len(cases)}


@app.post("/cases/{case_id}/review")
async def submit_human_review(case_id: str, request: ReviewRequest):
    """
    Human-in-the-loop review endpoint. Allows safety officer to approve
    or override risk category and status with audit logging.
    """
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM audit_cases WHERE case_id = ?", (case_id,)).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found in audit database.")

    # Determine updated status based on human decision
    decision = request.decision.upper()
    if "APPROVE" in decision:
        new_status = f"Verified: {row['risk_category']}"
        new_category = row["risk_category"]
    elif "OVERRIDE_LOW" in decision:
        new_status = "Overridden: LOW RISK"
        new_category = "LOW RISK"
    elif "OVERRIDE_MODERATE" in decision:
        new_status = "Overridden: MODERATE RISK"
        new_category = "MODERATE RISK"
    elif "OVERRIDE_HIGH" in decision:
        new_status = "Overridden: HIGH RISK"
        new_category = "HIGH RISK"
    else:
        new_status = f"Reviewed: {request.decision}"
        new_category = row["risk_category"]

    # Append to timeline
    timeline_list = json.loads(row["timeline_json"])
    timeline_list.append({
        "step_id": f"REVIEW_{uuid.uuid4().hex[:4]}",
        "agent_name": "Human Clinical Reviewer",
        "action": f"Physician Action: {request.decision}",
        "timestamp": get_iso_now(),
        "status": "success",
        "description": f"Safety Officer '{request.reviewer_name}' submitted decision: '{request.decision}'. Note: {request.reviewer_note or 'No clinical remarks.'}",
        "metadata": {"decision": request.decision, "reviewer": request.reviewer_name},
    })

    conn.execute("""
        UPDATE audit_cases
        SET human_decision = ?,
            reviewer_note = ?,
            review_status = ?,
            risk_category = ?,
            timeline_json = ?
        WHERE case_id = ?
    """, (
        request.decision,
        request.reviewer_note,
        new_status,
        new_category,
        json.dumps(timeline_list),
        case_id,
    ))
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "case_id": case_id,
        "human_decision": request.decision,
        "new_review_status": new_status,
        "new_risk_category": new_category,
        "updated_at": get_iso_now(),
    }


# =========================================================================
# RAG Safety Copilot Endpoints
# =========================================================================

@app.post("/chat", response_model=ChatResponse)
async def chat_rag(request: ChatRequest):
    """
    BioPulse RAG Safety Copilot:
    Grounds questions on retrieved FAERS historical adverse event signals,
    past patient audit cases in SQLite, active case session parameters,
    and FDA 21 CFR 314.80 / ICH E2D regulatory standards.
    """
    try:
        history_list = [h.model_dump() for h in request.history] if request.history else []
        result = await execute_rag_pipeline(
            query=request.message,
            history=history_list,
            active_case=request.active_case,
        )
        return ChatResponse(
            reply=result["reply"],
            sources=result["sources"],
            suggested_questions=result["suggested_questions"],
            timestamp=result["timestamp"],
        )
    except Exception as e:
        print(f"Error in /chat endpoint: {e}")
        # Return graceful clinical fallback response
        return ChatResponse(
            reply=f"BioPulse Safety Copilot encountered an unexpected processing event: {str(e)}. The safety mesh remains intact and operational.",
            sources=[],
            suggested_questions=["Explain the 12-dimensional XGBoost feature tensor", "What FAERS signals exist for Pembrolizumab?"],
            timestamp=get_iso_now(),
        )


@app.get("/chat/suggestions")
def get_chat_suggestions():
    """Returns curated initial discovery queries for the safety copilot."""
    return {
        "suggestions": [
            "Why was the current case classified in its risk tier?",
            "What adverse event signals exist for Pembrolizumab in FAERS?",
            "How does the safety mesh prevent prompt injection attacks?",
            "What are the FDA 15-day expedited reporting criteria?",
            "Explain the 12 features evaluated by the XGBoost model",
            "Show high-risk cases currently in the audit ledger",
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
