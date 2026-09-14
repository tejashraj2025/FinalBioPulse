import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  analyzeClinicalCase,
  executeRagChat,
  getFormattedAuditCases,
  loadAuditCasesRaw,
  updateAuditCase,
} from './src/server/safetyMesh';

const PORT = 3000;

async function startServer() {
  const app = express();

  // JSON request body parser
  app.use(express.json());

  // ---------------------------------------------------------------------------
  // API Routes (Mounted FIRST)
  // ---------------------------------------------------------------------------

  // GET /health
  app.get('/health', (req: Request, res: Response) => {
    const rawCases = loadAuditCasesRaw();
    res.json({
      status: 'healthy',
      service: 'BioPulse Pharmacovigilance Safety-Mesh',
      model_loaded: true,
      database: 'Durable Local Audit Store (audit_cases.json)',
      total_cases_audited: rawCases.length,
      timestamp: new Date().toISOString(),
    });
  });

  // GET /cases
  app.get('/cases', (req: Request, res: Response) => {
    try {
      const cases = getFormattedAuditCases();
      res.json({
        cases,
        total: cases.length,
      });
    } catch (err: any) {
      console.error('Error fetching cases:', err);
      res.status(500).json({ error: 'Failed to retrieve cases from audit ledger' });
    }
  });

  // POST /cases/:caseId/review
  app.post('/cases/:caseId/review', (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const { decision, reviewer_note, reviewer_name } = req.body;

      if (!decision) {
        return res.status(400).json({ error: 'Review decision is required' });
      }

      const decUpper = String(decision).toUpperCase();
      let newStatus: string;
      let newCategory: string;

      if (decUpper.includes('APPROVE')) {
        newStatus = 'Verified: HIGH RISK';
        newCategory = 'HIGH RISK';
      } else if (decUpper.includes('OVERRIDE_LOW')) {
        newStatus = 'Overridden: LOW RISK';
        newCategory = 'LOW RISK';
      } else if (decUpper.includes('OVERRIDE_MODERATE')) {
        newStatus = 'Overridden: MODERATE RISK';
        newCategory = 'MODERATE RISK';
      } else if (decUpper.includes('OVERRIDE_HIGH')) {
        newStatus = 'Overridden: HIGH RISK';
        newCategory = 'HIGH RISK';
      } else {
        newStatus = `Reviewed: ${decision}`;
        newCategory = 'REVIEWED';
      }

      const existingCases = loadAuditCasesRaw();
      const targetCase = existingCases.find((c) => c.case_id === caseId);

      if (!targetCase) {
        return res.status(404).json({ error: `Case ${caseId} not found in audit ledger` });
      }

      if (decUpper.includes('APPROVE')) {
        newStatus = `Verified: ${targetCase.risk_category || 'HIGH RISK'}`;
        newCategory = targetCase.risk_category || 'HIGH RISK';
      }

      let timelineList: any[] = [];
      try {
        timelineList =
          typeof targetCase.timeline_json === 'string'
            ? JSON.parse(targetCase.timeline_json)
            : targetCase.timeline_json || [];
      } catch (e) {
        timelineList = [];
      }

      timelineList.push({
        step_id: `REVIEW_${Math.random().toString(36).substring(2, 6)}`,
        agent_name: 'Human Clinical Reviewer',
        action: `Physician Action: ${decision}`,
        timestamp: new Date().toISOString(),
        status: 'success',
        description: `Safety Officer '${reviewer_name || 'Attending Physician'}' submitted decision: '${decision}'. Note: ${reviewer_note || 'No clinical remarks.'}`,
        metadata: { decision, reviewer: reviewer_name },
      });

      const updated = updateAuditCase(caseId, {
        human_decision: decision,
        reviewer_note: reviewer_note || null,
        review_status: newStatus,
        risk_category: newCategory,
        timeline_json: JSON.stringify(timelineList),
      });

      res.json({
        status: 'success',
        case_id: caseId,
        human_decision: decision,
        new_review_status: newStatus,
        new_risk_category: newCategory,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error submitting review:', err);
      res.status(500).json({ error: err.message || 'Internal error' });
    }
  });

  // POST /analyze
  app.post('/analyze', async (req: Request, res: Response) => {
    try {
      const { clinical_note, patient_name } = req.body;
      if (!clinical_note || typeof clinical_note !== 'string') {
        return res.status(400).json({ error: 'clinical_note string is required' });
      }

      const result = await analyzeClinicalCase(clinical_note, patient_name);
      res.json(result);
    } catch (err: any) {
      console.error('Error analyzing clinical case:', err);
      res.status(500).json({ error: err.message || 'Failed to process clinical note in safety mesh' });
    }
  });

  // POST /chat
  app.post('/chat', async (req: Request, res: Response) => {
    try {
      const { message, history, active_case } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required' });
      }

      const response = await executeRagChat(message, history || [], active_case);
      res.json(response);
    } catch (err: any) {
      console.error('Error in chat endpoint:', err);
      res.status(500).json({
        reply: 'BioPulse Safety Copilot encountered an unexpected error. The safety mesh remains operational.',
        sources: [],
        suggested_questions: ['Explain the 12-dimensional XGBoost feature tensor', 'What FAERS signals exist?'],
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /chat/suggestions
  app.get('/chat/suggestions', (req: Request, res: Response) => {
    res.json({
      suggestions: [
        'Why was the current case classified in its risk tier?',
        'What adverse event signals exist for Pembrolizumab in FAERS?',
        'How does the safety mesh prevent prompt injection attacks?',
        'What are the FDA 15-day expedited reporting criteria?',
        'Explain the 12 features evaluated by the XGBoost model',
        'Show high-risk cases currently in the audit ledger',
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // Vite Middleware / Production Static Serving
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BioPulse] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[BioPulse] Failed to start server:', err);
  process.exit(1);
});
