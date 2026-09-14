"""
BioPulse Pharmacovigilance Safety-Mesh
Synthetic Training Script for XGBoost Risk Classifier

Generates a realistic synthetic adverse drug reaction dataset based on clinical
pharmacovigilance heuristics and trains a lightweight, explainable XGBoost model.
Exports the trained model to `xgboost_model.json`.
"""

import json
import os
import random
import numpy as np

FEATURE_NAMES = [
    "symptom_nausea",
    "symptom_fever",
    "symptom_hypotension",
    "symptom_rash",
    "symptom_dizziness",
    "symptom_hepatotoxicity",
    "symptom_arrhythmia",
    "severe_symptom_flag",
    "total_symptom_count",
    "rapid_onset_flag",
    "relevant_evidence_found",
    "faers_case_frequency",
]


def generate_synthetic_dataset(num_samples: int = 600, random_seed: int = 42):
    np.random.seed(random_seed)
    random.seed(random_seed)

    X = []
    y = []

    for _ in range(num_samples):
        # Sample symptoms
        nausea = int(random.random() < 0.35)
        fever = int(random.random() < 0.25)
        hypotension = int(random.random() < 0.15)
        rash = int(random.random() < 0.30)
        dizziness = int(random.random() < 0.28)
        hepatotoxicity = int(random.random() < 0.10)
        arrhythmia = int(random.random() < 0.12)

        symptoms = [nausea, fever, hypotension, rash, dizziness, hepatotoxicity, arrhythmia]
        total_count = sum(symptoms)
        if total_count == 0:
            # Ensure at least one symptom exists
            idx = random.randint(0, 6)
            symptoms[idx] = 1
            nausea, fever, hypotension, rash, dizziness, hepatotoxicity, arrhythmia = symptoms
            total_count = 1

        # Severity and onset
        critical_symptoms = hypotension or hepatotoxicity or arrhythmia
        severe_flag = 1 if (critical_symptoms or (random.random() < 0.25)) else 0
        rapid_onset = int(random.random() < 0.40)
        
        # FAERS evidence
        has_faers = int(random.random() < 0.55 if critical_symptoms else random.random() < 0.30)
        faers_freq = random.randint(1, 6) if has_faers else 0

        # Construct feature vector
        vec = [
            nausea,
            fever,
            hypotension,
            rash,
            dizziness,
            hepatotoxicity,
            arrhythmia,
            severe_flag,
            total_count,
            rapid_onset,
            has_faers,
            faers_freq,
        ]

        # Clinical risk scoring rule for label assignment
        # High risk factors: critical symptoms, severe rating, rapid onset, historical FAERS signals
        risk_score = (
            hypotension * 3.5 +
            arrhythmia * 4.0 +
            hepatotoxicity * 4.5 +
            severe_flag * 2.2 +
            rapid_onset * 1.5 +
            has_faers * 1.8 +
            (faers_freq * 0.4) +
            (total_count * 0.6) +
            nausea * 0.3 +
            dizziness * 0.5 +
            fever * 0.8 +
            rash * 0.4 +
            np.random.normal(0, 0.4)
        )

        # Label: 1 for High/Critical Risk signal, 0 for Low/Moderate baseline
        label = 1 if risk_score >= 4.2 else 0

        X.append(vec)
        y.append(label)

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def train_and_save_model(output_path: str = "xgboost_model.json"):
    import xgboost as xgb
    from sklearn.metrics import accuracy_score, roc_auc_score
    from sklearn.model_selection import train_test_split

    print(f"Generating synthetic clinical ADR dataset...")
    X, y = generate_synthetic_dataset(num_samples=750, random_seed=42)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print(f"Training XGBoost Classifier on {len(X_train)} samples...")
    model = xgb.XGBClassifier(
        n_estimators=75,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
    )

    model.fit(X_train, y_train)

    preds_prob = model.predict_proba(X_test)[:, 1]
    preds_binary = (preds_prob >= 0.5).astype(int)

    acc = accuracy_score(y_test, preds_binary)
    auc = roc_auc_score(y_test, preds_prob)

    print(f"Model Training Complete.")
    print(f"  Accuracy: {acc:.4f}")
    print(f"  ROC-AUC : {auc:.4f}")

    # Feature importance
    feature_importances = model.feature_importances_
    importance_map = {name: float(imp) for name, imp in zip(FEATURE_NAMES, feature_importances)}
    print("  Feature Importances:")
    for name, imp in sorted(importance_map.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"    - {name}: {imp:.4f}")

    # Save to JSON
    model.save_model(output_path)
    print(f"Saved trained XGBoost model to '{output_path}'")

    # Also save metadata for explainability & frontend
    meta_path = "model_meta.json"
    meta = {
        "feature_names": FEATURE_NAMES,
        "feature_importances": importance_map,
        "accuracy": round(float(acc), 4),
        "roc_auc": round(float(auc), 4),
        "n_samples": len(X),
        "model_version": "BioPulse-XGB-v1.0",
    }
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"Saved model metadata to '{meta_path}'")


if __name__ == "__main__":
    train_and_save_model()
