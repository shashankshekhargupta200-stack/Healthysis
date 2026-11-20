import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDepartmentById } from "@/lib/departmentCatalog";
import { DepartmentId, DetectedPatternItem } from "@/types";

function cleanJsonText(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) return match[1].trim();
  return raw.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const departmentId: DepartmentId = body.departmentId || "all";
    const resume = body.resume || {};
    const vaultRecords = Array.isArray(body.vaultRecords) ? body.vaultRecords : [];
    const mealLogs = Array.isArray(body.mealLogs) ? body.mealLogs : [];
    const symptomLogs = Array.isArray(body.symptomLogs) ? body.symptomLogs : [];

    const dept = getDepartmentById(departmentId);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "GEMINI_API_KEY not configured.",
        patterns: []
      }, { status: 200 });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        ...({ thinkingConfig: { thinkingBudget: 0 } } as Record<string, unknown>)
      } as Record<string, unknown>
    });

    const prompt = `
You are an expert clinical AI assistant for Healthysis Healthfolio.
You are generating a department-customized Health Resume for a patient visiting a doctor in the following department:

DEPARTMENT: ${dept.name} (${dept.shortName})
FOCUS AREA: ${dept.focusArea}

PATIENT CLINICAL DOSSIER:
- Vitals: ${JSON.stringify(resume.vitals || {})}
- Report Biomarkers: ${JSON.stringify(resume.reportMetrics || {})}
- Diagnoses: ${JSON.stringify(resume.diagnoses || [])}
- Active Medications: ${JSON.stringify(resume.medications || [])}
- Allergies: ${JSON.stringify(resume.allergiesList || [])} (Summary: ${resume.allergiesSummary || ""})
- Surgeries: ${JSON.stringify(resume.surgeries || [])}
- Lifestyle Notes: ${JSON.stringify(resume.lifestyle || {})}
- Recent Test Reports: ${JSON.stringify((resume.testReports || []).slice(0, 10))}
- Recent Vault Documents Summary: ${JSON.stringify(vaultRecords.slice(0, 8).map((r: Record<string, unknown>) => ({ title: r.title, category: r.category, summary: r.patient_summary })))}
- Recent Meal Logs: ${JSON.stringify(mealLogs.slice(0, 10))}
- Recent Symptom Logs: ${JSON.stringify(symptomLogs.slice(0, 10))}

TASK:
Analyze the patient's records specifically through the lens of ${dept.name} (${dept.shortName}).
Identify 2 to 4 high-value clinical patterns, trends, or correlations relevant to this department:
1. Biomarker / Vital Trajectory (e.g. blood pressure stability or spikes, glycemic trajectory, lipid elevation, vitamin deficiency, renal/liver marker trends)
2. Symptom Recurrence (e.g. repeated headaches, acid reflux after certain meals, joint stiffness, dysuria, palpitations)
3. Dietary or Lifestyle Correlation (e.g. high-sodium meals correlating with BP spikes, late dinners correlating with elevated morning glucose, smoking impact)
4. Key Pre-consultation Precaution (e.g. anticoagulant bleeding risk for dentistry/orthopedics, renal caution with contrast/NSAIDs, glycemic control before surgery)

Return a JSON array of objects conforming exactly to this structure:
[
  {
    "id": "pattern-1",
    "category": "trend" | "recurrent_symptom" | "diet_correlation" | "vital_trajectory" | "clinical_pearl",
    "title": "Short descriptive title (e.g. 'Stage 1 Hypertensive Trend', 'Late Dinner Glycemic Spike Correlation')",
    "observation": "Clear factual observation summarizing findings from user-uploaded records",
    "relevance": "Why this is critical for the consulting specialist to know",
    "severity": "normal" | "notable" | "attention"
  }
]
`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleanJson = cleanJsonText(rawText);

    let patterns: DetectedPatternItem[] = [];
    try {
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) {
        patterns = parsed;
      } else if (parsed && Array.isArray(parsed.patterns)) {
        patterns = parsed.patterns;
      }
    } catch {
      console.warn("Could not parse Gemini JSON response for patterns, fallback to empty array.");
    }

    return NextResponse.json({
      success: true,
      departmentId,
      patterns
    });
  } catch (error: unknown) {
    console.error("Department patterns generation error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate AI patterns",
      patterns: []
    }, { status: 200 });
  }
}
