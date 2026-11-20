import {
  DepartmentId,
  DepartmentCustomization,
  DetectedPatternItem,
  HealthResumeData,
  HealthDiagnosisItem,
  HealthMedicationItem,
  HealthTestReportItem,
  HealthSurgeryItem
} from "@/types";
import { getDepartmentById, isTextRelevantToDepartment } from "@/lib/departmentCatalog";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export interface PrioritizedDepartmentData {
  customization: DepartmentCustomization;
  prioritizedDiagnoses: Array<HealthDiagnosisItem & { isDepartmentFocus?: boolean }>;
  prioritizedMedications: Array<HealthMedicationItem & { isDepartmentFocus?: boolean }>;
  prioritizedTestReports: Array<HealthTestReportItem & { isDepartmentFocus?: boolean }>;
  prioritizedSurgeries: Array<HealthSurgeryItem & { isDepartmentFocus?: boolean }>;
}

export function detectDepartmentPatterns(
  resume: HealthResumeData,
  departmentId: DepartmentId,
  vaultRecords: unknown[] = [],
  mealLogs: unknown[] = [],
  symptomLogs: unknown[] = []
): PrioritizedDepartmentData {
  const dept = getDepartmentById(departmentId);
  const patterns: DetectedPatternItem[] = [];

  // 1. Gather all numerical metrics from vitals, reportMetrics, and vault records
  const metrics = { ...(resume.reportMetrics || {}) };
  for (const record of vaultRecords.filter(isRecord)) {
    if (isRecord(record.extracted_data)) {
      const ext = record.extracted_data;
      if (Array.isArray(ext.biomarkers)) {
        for (const bm of ext.biomarkers.filter(isRecord)) {
          const name = stringValue(bm.name);
          const val = stringValue(bm.value);
          if (name && val && !metrics[name]) {
            metrics[name] = val;
          }
        }
      }
    }
  }

  // Helper for metrics lookup
  const getMetric = (nameKeywords: string[]): number | null => {
    for (const [key, val] of Object.entries(metrics)) {
      const lower = key.toLowerCase();
      if (nameKeywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        const num = parseNumber(val);
        if (num !== null) return num;
      }
    }
    return null;
  };

  // Helper for BP
  const bpText = resume.vitals.bloodPressure || metrics["Systolic BP"] ? `${metrics["Systolic BP"]}/${metrics["Diastolic BP"]}` : "";
  const [systolic, diastolic] = (bpText.match(/\d+/g) || []).map(Number);

  // 2. Department-Specific Heuristics & Trends
  switch (dept.id) {
    case "cardiology": {
      // Blood Pressure pattern
      if (systolic && diastolic) {
        if (systolic >= 140 || diastolic >= 90) {
          patterns.push({
            id: "cardio-bp-elevated",
            category: "vital_trajectory",
            title: "Stage 2 Hypertensive Trend",
            observation: `Current blood pressure reading is elevated at ${systolic}/${diastolic} mmHg (above 130/80 mmHg threshold).`,
            relevance: "Primary cardiovascular risk indicator requiring hemodynamic review and medication adjustment.",
            severity: "attention"
          });
        } else if (systolic >= 130 || diastolic >= 80) {
          patterns.push({
            id: "cardio-bp-stage1",
            category: "vital_trajectory",
            title: "Stage 1 Hypertension / Borderline",
            observation: `Resting blood pressure logged at ${systolic}/${diastolic} mmHg shows mild vascular elevation.`,
            relevance: "Early warning for arterial stiffness and microvascular strain.",
            severity: "notable"
          });
        } else {
          patterns.push({
            id: "cardio-bp-optimal",
            category: "vital_trajectory",
            title: "Normotensive Hemodynamic Profile",
            observation: `Latest resting blood pressure is well-controlled at ${systolic}/${diastolic} mmHg.`,
            relevance: "Confirms stable baseline vascular tension.",
            severity: "normal"
          });
        }
      }

      // Heart Rate
      const hr = parseNumber(resume.vitals.heartRate) ?? getMetric(["heart rate", "pulse"]);
      if (hr) {
        if (hr > 100) {
          patterns.push({
            id: "cardio-hr-tachy",
            category: "trend",
            title: "Tachycardic Resting Pulse",
            observation: `Resting heart rate recorded at ${hr} bpm (exceeds 100 bpm baseline).`,
            relevance: "May indicate sympathetic drive, dehydration, thyroid activity, or arrhythmia.",
            severity: "attention"
          });
        } else if (hr < 55) {
          patterns.push({
            id: "cardio-hr-brady",
            category: "trend",
            title: "Bradycardic Pulse Pattern",
            observation: `Resting heart rate observed at ${hr} bpm (below 60 bpm baseline).`,
            relevance: "Requires evaluation for sinus bradycardia, conduction delay, or athletic baseline.",
            severity: "notable"
          });
        }
      }

      // Lipid Profile
      const ldl = getMetric(["ldl"]);
      const chol = getMetric(["total cholesterol", "cholesterol"]);
      const tg = getMetric(["triglyceride"]);
      if (ldl && ldl > 130) {
        patterns.push({
          id: "cardio-lipid-ldl",
          category: "trend",
          title: "Atherogenic Lipid Trajectory (High LDL)",
          observation: `Serum LDL cholesterol recorded at ${ldl} mg/dL (optimal target < 100 mg/dL for primary prevention).`,
          relevance: "Key modifiable target for coronary atherosclerosis risk stratification.",
          severity: "attention"
        });
      } else if (tg && tg > 150) {
        patterns.push({
          id: "cardio-lipid-tg",
          category: "trend",
          title: "Hypertriglyceridemia Pattern",
          observation: `Serum triglycerides elevated at ${tg} mg/dL (target < 150 mg/dL).`,
          relevance: "Correlates with metabolic syndrome and dietary carbohydrate/fat processing.",
          severity: "notable"
        });
      } else if (chol && chol > 200) {
        patterns.push({
          id: "cardio-lipid-chol",
          category: "trend",
          title: "Borderline Total Cholesterol",
          observation: `Total cholesterol logged at ${chol} mg/dL.`,
          relevance: "Suggests lipid panel restaging and dietary counseling.",
          severity: "notable"
        });
      }

      // Dietary Sodium / Late Meals Correlation
      const highSodiumMeals = mealLogs.filter(isRecord).filter((m) => {
        const name = stringValue(m.food_name).toLowerCase();
        return name.includes("pickle") || name.includes("fry") || name.includes("pizza") || name.includes("ramen") || name.includes("chips");
      });
      if (highSodiumMeals.length >= 2) {
        patterns.push({
          id: "cardio-diet-sodium",
          category: "diet_correlation",
          title: "Dietary Sodium / Fluid Load Correlation",
          observation: `Multiple recent meal logs (${highSodiumMeals.length} logged items) contain high-sodium processed or fried foods.`,
          relevance: "Dietary sodium spikes correlate with episodic BP elevation and volume expansion.",
          severity: "notable"
        });
      }

      // Symptom logs correlation for cardiology (chest discomfort or palpitations)
      const cardioSymptoms = symptomLogs.filter(isRecord).filter((s) => {
        const text = (stringValue(s.symptom) + " " + stringValue(s.symptoms) + " " + stringValue(isRecord(s.symptoms) ? s.symptoms.raw_text : "")).toLowerCase();
        return text.includes("palpitation") || text.includes("chest") || text.includes("flutter") || text.includes("angina");
      });
      if (cardioSymptoms.length >= 1) {
        patterns.push({
          id: "cardio-symptom-log",
          category: "recurrent_symptom",
          title: "Logged Cardiovascular Symptoms (Palpitations / Chest)",
          observation: `${cardioSymptoms.length} documented episodes of chest discomfort or palpitations in patient logs.`,
          relevance: "Clinical red-flag requiring ambulatory rhythm monitoring (Holter) or stress echocardiography.",
          severity: "attention"
        });
      }
      break;
    }

    case "endocrinology": {
      // Glucose & HbA1c
      const glucose = getMetric(["glucose", "fasting glucose", "random glucose"]);
      const hba1c = getMetric(["hba1c"]);
      if (hba1c) {
        if (hba1c >= 6.5) {
          patterns.push({
            id: "endo-hba1c-diabetic",
            category: "vital_trajectory",
            title: "Diabetic Glycemic Trajectory (HbA1c >= 6.5%)",
            observation: `Latest HbA1c is ${hba1c}%, confirming chronic hyperglycemia over the prior 90-day window.`,
            relevance: "Critical index for anti-diabetic medication titration and microvascular surveillance.",
            severity: "attention"
          });
        } else if (hba1c >= 5.7) {
          patterns.push({
            id: "endo-hba1c-prediabetes",
            category: "vital_trajectory",
            title: "Prediabetic Metabolic Drift (HbA1c 5.7 - 6.4%)",
            observation: `HbA1c recorded at ${hba1c}% indicates impaired glucose tolerance and insulin resistance.`,
            relevance: "Early therapeutic lifestyle and insulin-sensitizing intervention window.",
            severity: "notable"
          });
        }
      }

      if (glucose && glucose >= 126) {
        patterns.push({
          id: "endo-fasting-hyper",
          category: "trend",
          title: "Elevated Fasting/Random Blood Glucose",
          observation: `Blood glucose reading logged at ${glucose} mg/dL (above the 100 mg/dL normal threshold).`,
          relevance: "Indicates active glucose dysregulation requiring correlation with meal timing.",
          severity: "attention"
        });
      }

      // Thyroid Panel
      const tsh = getMetric(["tsh", "thyroid"]);
      if (tsh) {
        if (tsh > 4.5) {
          patterns.push({
            id: "endo-tsh-high",
            category: "trend",
            title: "Hypothyroid Trend (Elevated TSH)",
            observation: `Serum TSH measured at ${tsh} mIU/L (above reference range 0.4 - 4.2 mIU/L).`,
            relevance: "Points towards primary hypothyroidism, metabolic slowing, or sub-therapeutic thyroxine dose.",
            severity: "attention"
          });
        } else if (tsh < 0.3) {
          patterns.push({
            id: "endo-tsh-low",
            category: "trend",
            title: "Hyperthyroid / Suppressed TSH Trend",
            observation: `Serum TSH measured at ${tsh} mIU/L (suppressed below 0.4 mIU/L).`,
            relevance: "Points towards thyrotoxicosis, over-replacement, or autonomic thyroid activity.",
            severity: "attention"
          });
        }
      }

      // Late Night Meals & Glycemic correlation
      const lateMeals = mealLogs.filter(isRecord).filter((m) => {
        const timeStr = stringValue(m.timestamp);
        if (!timeStr) return false;
        const d = new Date(timeStr);
        return !isNaN(d.getTime()) && (d.getHours() >= 21 || (d.getHours() === 20 && d.getMinutes() >= 45));
      });
      if (lateMeals.length >= 2) {
        patterns.push({
          id: "endo-late-dinners",
          category: "diet_correlation",
          title: "Late-Night Dinner Frequency Pattern",
          observation: `${lateMeals.length} recorded dinners occurred after 9:00 PM in recent logs.`,
          relevance: "Late-night carbohydrate intake increases overnight hepatic glucose output and morning dawn phenomenon.",
          severity: "notable"
        });
      }
      break;
    }

    case "orthopedics": {
      const vitD = getMetric(["vitamin d", "vit d"]);
      const calcium = getMetric(["calcium"]);
      const uricAcid = getMetric(["uric acid"]);
      if (vitD && vitD < 30) {
        patterns.push({
          id: "ortho-vitd-deficiency",
          category: "trend",
          title: vitD < 20 ? "Vitamin D Deficiency (< 20 ng/mL)" : "Vitamin D Insufficiency (20-30 ng/mL)",
          observation: `Serum 25-OH Vitamin D is sub-optimal at ${vitD} ng/mL (optimal target >= 30 ng/mL).`,
          relevance: "Impedes bone mineralization, accelerates joint osteopenia, and worsens musculoskeletal aches.",
          severity: vitD < 20 ? "attention" : "notable"
        });
      }

      if (uricAcid && uricAcid >= 7.0) {
        patterns.push({
          id: "ortho-uric-acid-high",
          category: "trend",
          title: "Hyperuricemia Pattern (Gout Risk)",
          observation: `Serum uric acid elevated at ${uricAcid} mg/dL (normal male threshold < 7.0 mg/dL).`,
          relevance: "Predisposes to urate crystal deposition, acute podagra, and inflammatory monoarthritis.",
          severity: "attention"
        });
      }

      if (calcium && calcium < 8.5) {
        patterns.push({
          id: "ortho-hypocalcemia",
          category: "trend",
          title: "Hypocalcemia Indicator",
          observation: `Total calcium measured at ${calcium} mg/dL (reference range 8.5 - 10.5 mg/dL).`,
          relevance: "Bone metabolism and neuromuscular risk factor requiring supplementation evaluation.",
          severity: "notable"
        });
      }

      // Check BMI joint stress
      const bmi = parseNumber(resume.bmi);
      if (bmi && bmi >= 28) {
        patterns.push({
          id: "ortho-bmi-joint-load",
          category: "vital_trajectory",
          title: "Weight-Bearing Mechanical Joint Stress",
          observation: `BMI of ${bmi} kg/m² adds significant mechanical load across bilateral knees, hips, and lumbar spine.`,
          relevance: "Major determinant for accelerated cartilage wear and osteoarthritis progression.",
          severity: "notable"
        });
      }
      break;
    }

    case "gastroenterology": {
      const sgot = getMetric(["sgot", "ast"]);
      const sgpt = getMetric(["sgpt", "alt"]);
      const bilirubin = getMetric(["bilirubin"]);
      if ((sgot && sgot > 45) || (sgpt && sgpt > 45)) {
        patterns.push({
          id: "gastro-lft-elevation",
          category: "trend",
          title: "Hepatic Transaminase Elevation (Transaminitis)",
          observation: `Elevated liver enzymes detected: SGOT ${sgot ?? "—"} U/L, SGPT ${sgpt ?? "—"} U/L (reference upper limit ~40 U/L).`,
          relevance: "Signals hepatocellular inflammation, metabolic fatty liver (NAFLD/MASLD), or medication hepatotoxicity.",
          severity: "attention"
        });
      }
      if (bilirubin && bilirubin > 1.2) {
        patterns.push({
          id: "gastro-bilirubin-high",
          category: "trend",
          title: "Elevated Serum Bilirubin",
          observation: `Total bilirubin recorded at ${bilirubin} mg/dL (reference range 0.2 - 1.2 mg/dL).`,
          relevance: "Requires evaluation for biliary clearance, hemolysis, or hepatic excretion kinetics.",
          severity: "notable"
        });
      }

      // Symptom logs for GERD/Acidity
      const acidSymptoms = symptomLogs.filter(isRecord).filter((s) => {
        const text = (stringValue(s.symptoms) + " " + stringValue(isRecord(s.symptoms) ? s.symptoms.raw_text : "")).toLowerCase();
        return text.includes("acid") || text.includes("heartburn") || text.includes("bloat") || text.includes("nausea") || text.includes("gerd");
      });
      if (acidSymptoms.length >= 2) {
        patterns.push({
          id: "gastro-gerd-recurrence",
          category: "recurrent_symptom",
          title: "Recurrent Dyspeptic & Acid Reflux Episodes",
          observation: `${acidSymptoms.length} distinct episodes of acidity, reflux, or bloating logged in recent records.`,
          relevance: "Points towards symptomatic GERD or functional dyspepsia requiring dietary and PPI evaluation.",
          severity: "notable"
        });
      }
      break;
    }

    case "pulmonology": {
      const spo2 = parseNumber(resume.vitals.spo2) ?? getMetric(["spo2"]);
      if (spo2) {
        if (spo2 < 94) {
          patterns.push({
            id: "pulmo-spo2-low",
            category: "vital_trajectory",
            title: "Sub-Optimal Resting Oxygen Saturation (SpO2 < 94%)",
            observation: `Resting SpO2 recorded at ${spo2}% on ambient room air.`,
            relevance: "Significant respiratory flag requiring spirometry, alveolar-arterial gradient check, and inhaler review.",
            severity: "attention"
          });
        } else {
          patterns.push({
            id: "pulmo-spo2-stable",
            category: "vital_trajectory",
            title: "Stable Ambient Oxygenation",
            observation: `Resting peripheral oxygen saturation maintained at ${spo2}%.`,
            relevance: "Adequate baseline oxygen delivery at rest.",
            severity: "normal"
          });
        }
      }

      // Smoking history in lifestyle
      if (resume.lifestyle.smoking && !resume.lifestyle.smoking.toLowerCase().includes("never") && !resume.lifestyle.smoking.toLowerCase().includes("no")) {
        patterns.push({
          id: "pulmo-smoking-risk",
          category: "trend",
          title: "Active/Past Tobacco Exposure Factor",
          observation: `Tobacco history noted: "${resume.lifestyle.smoking}".`,
          relevance: "Elevates risk profile for small airway obstruction, chronic bronchitis, and reactive airway disease.",
          severity: "attention"
        });
      }

      // Symptom logs correlation for pulmonology (cough, breathlessness, wheezing)
      const pulmoSymptoms = symptomLogs.filter(isRecord).filter((s) => {
        const text = (stringValue(s.symptom) + " " + stringValue(s.symptoms) + " " + stringValue(isRecord(s.symptoms) ? s.symptoms.raw_text : "")).toLowerCase();
        return text.includes("cough") || text.includes("breath") || text.includes("wheez") || text.includes("chest");
      });
      if (pulmoSymptoms.length >= 1) {
        patterns.push({
          id: "pulmo-cough-breathless-log",
          category: "recurrent_symptom",
          title: "Logged Respiratory Symptoms & Trajectory",
          observation: `${pulmoSymptoms.length} documented episodes of cough, shortness of breath, or chest tightness in daily logs.`,
          relevance: "Highlights active airway sensitivity or subacute bronchopulmonary symptoms needing clinical correlation.",
          severity: pulmoSymptoms.length >= 2 ? "attention" : "notable"
        });
      }
      break;
    }

    case "nephrology": {
      const creatinine = getMetric(["creatinine", "serum creatinine"]);
      const urea = getMetric(["blood urea", "urea", "bun"]);
      const egfr = getMetric(["egfr"]);
      if (creatinine && creatinine >= 1.2) {
        patterns.push({
          id: "nephro-creatinine-high",
          category: "trend",
          title: "Serum Creatinine Elevation (Renal Clearance)",
          observation: `Serum creatinine recorded at ${creatinine} mg/dL (target male < 1.2 mg/dL, female < 1.0 mg/dL).`,
          relevance: "Direct marker of decreased glomerular filtration requiring staging and nephrotoxic drug avoidance.",
          severity: "attention"
        });
      }
      if (urea && urea > 45) {
        patterns.push({
          id: "nephro-urea-high",
          category: "trend",
          title: "Elevated Nitrogenous Waste (Blood Urea)",
          observation: `Blood urea / BUN level elevated at ${urea} mg/dL.`,
          relevance: "May reflect pre-renal volume depletion, high protein turnover, or intrinsic renal clearance drop.",
          severity: "notable"
        });
      }
      if (egfr && egfr < 60) {
        patterns.push({
          id: "nephro-egfr-stage3",
          category: "trend",
          title: "Reduced Estimated GFR (< 60 mL/min/1.73m²)",
          observation: `eGFR of ${egfr} mL/min indicates Stage 3 chronic kidney impairment.`,
          relevance: "Requires strict avoidance of contrast dyes, NSAIDs, and dose adjustments for excreted drugs.",
          severity: "attention"
        });
      }
      break;
    }

    case "neurology": {
      const vitB12 = getMetric(["vitamin b12", "b12"]);
      if (vitB12 && vitB12 < 300) {
        patterns.push({
          id: "neuro-b12-low",
          category: "trend",
          title: vitB12 < 200 ? "Severe Vitamin B12 Deficiency (< 200 pg/mL)" : "Borderline Vitamin B12 (200-300 pg/mL)",
          observation: `Serum B12 measured at ${vitB12} pg/mL (optimal neurological range >= 400 pg/mL).`,
          relevance: "Major cause of peripheral neuropathy, tingling/numbness, cognitive fatigue, and subacute spinal cord changes.",
          severity: "attention"
        });
      }

      const migraineSymptoms = symptomLogs.filter(isRecord).filter((s) => {
        const text = (stringValue(s.symptoms) + " " + stringValue(isRecord(s.symptoms) ? s.symptoms.raw_text : "")).toLowerCase();
        return text.includes("migraine") || text.includes("headache") || text.includes("dizz") || text.includes("numb");
      });
      if (migraineSymptoms.length >= 2) {
        patterns.push({
          id: "neuro-headache-recurrence",
          category: "recurrent_symptom",
          title: "Recurrent Cephalea / Migraine Cluster Pattern",
          observation: `${migraineSymptoms.length} episodes of headaches, migraines, or neurological symptoms logged across records.`,
          relevance: "Suggests episodic migraine pattern requiring prophylactic evaluation and trigger identification.",
          severity: "notable"
        });
      }
      break;
    }

    case "dentistry": {
      // Check for diabetic status or blood thinners which heavily impact dental procedures
      const hba1c = getMetric(["hba1c"]);
      const hasBloodThinner = resume.medications.some((m) => {
        const med = m.medicine.toLowerCase();
        return med.includes("aspirin") || med.includes("clopidogrel") || med.includes("warfarin") || med.includes("apixaban");
      });
      if (hasBloodThinner) {
        patterns.push({
          id: "dental-anticoagulant",
          category: "clinical_pearl",
          title: "Antithrombotic / Antiplatelet Regimen Precaution",
          observation: `Patient is actively prescribed antiplatelet/anticoagulant medication.`,
          relevance: "Direct procedural bleeding risk for tooth extraction, periodontal surgery, and deep scaling.",
          severity: "attention"
        });
      }
      if (hba1c && hba1c >= 7.0) {
        patterns.push({
          id: "dental-glycemic-healing",
          category: "trend",
          title: "Hyperglycemia Impairing Periodontal Tissue Healing",
          observation: `HbA1c at ${hba1c}% indicates delayed post-surgical mucosal healing and heightened infection susceptibility.`,
          relevance: "Antibiotic prophylaxis and pre-procedural glycemic optimization advised.",
          severity: "notable"
        });
      }
      break;
    }

    case "dermatology": {
      // Check for known allergies or antihistamine usage
      const allergyCount = resume.allergiesList.length;
      if (allergyCount > 0) {
        patterns.push({
          id: "derma-atopic-profile",
          category: "clinical_pearl",
          title: "Atopic Sensitivity & Allergen Reactivity",
          observation: `${allergyCount} active allergen sensitivities documented in patient history.`,
          relevance: "High predisposition for contact dermatitis, eczema flares, and topical cross-reactivity.",
          severity: "notable"
        });
      }
      break;
    }

    case "psychiatry": {
      // Sleep & mental noise
      const sleepSymptoms = symptomLogs.filter(isRecord).filter((s) => {
        const text = (stringValue(s.symptoms) + " " + stringValue(isRecord(s.symptoms) ? s.symptoms.raw_text : "")).toLowerCase();
        return text.includes("sleep") || text.includes("insomnia") || text.includes("anxiety") || text.includes("panic") || text.includes("stress");
      });
      if (sleepSymptoms.length >= 2) {
        patterns.push({
          id: "psych-sleep-anxiety",
          category: "recurrent_symptom",
          title: "Recurrent Sleep Disturbance & Stress Patterns",
          observation: `${sleepSymptoms.length} entries of poor sleep, anxiety, or emotional fatigue documented in symptom history.`,
          relevance: "Important for evaluating circadian disruption and psychiatric wellness trajectories.",
          severity: "notable"
        });
      }
      break;
    }

    default: {
      // For All / General, check overarching vital stability
      if (systolic && diastolic) {
        patterns.push({
          id: "gen-bp-baseline",
          category: "vital_trajectory",
          title: "Baseline Hemodynamic Status",
          observation: `Resting blood pressure logged at ${systolic}/${diastolic} mmHg.`,
          relevance: "Essential baseline vital parameter across routine physical examinations.",
          severity: systolic >= 130 ? "notable" : "normal"
        });
      }
      const glucose = getMetric(["glucose", "fasting"]);
      if (glucose) {
        patterns.push({
          id: "gen-glucose-baseline",
          category: "trend",
          title: "Metabolic Glucose Level",
          observation: `Blood glucose recorded at ${glucose} mg/dL.`,
          relevance: "Systemic indicator of endocrine balance and metabolic stability.",
          severity: glucose >= 120 ? "notable" : "normal"
        });
      }

      // Multi-day fever or viral prodrome from symptom logs
      const feverOrViral = symptomLogs.filter(isRecord).filter((s) => {
        const text = (stringValue(s.symptom) + " " + stringValue(s.symptoms) + " " + stringValue(isRecord(s.symptoms) ? s.symptoms.raw_text : "")).toLowerCase();
        return text.includes("fever") || text.includes("temp") || text.includes("body ache") || text.includes("chills");
      });
      if (feverOrViral.length >= 2) {
        patterns.push({
          id: "gen-fever-cluster-log",
          category: "recurrent_symptom",
          title: "Multi-Day Systemic Symptoms (Fever / Body Ache)",
          observation: `${feverOrViral.length} daily log entries of fever or body aches documented in recent history.`,
          relevance: "Suggests active systemic inflammatory or infectious episode.",
          severity: "notable"
        });
      }
      break;
    }
  }

  // 3. Fallback baseline if no anomalies detected
  if (patterns.length === 0) {
    patterns.push({
      id: `${dept.id}-baseline-normal`,
      category: "trend",
      title: `${dept.name} Baseline Parameters`,
      observation: `Records currently in Healthfolio demonstrate no acute or decompensated ${dept.shortName.toLowerCase()} anomalies.`,
      relevance: `Patient maintains stable documented vitals and laboratory findings within the ${dept.focusArea.toLowerCase()} domain.`,
      severity: "normal"
    });
  }

  // 4. Cross-Department Safety Section
  const crossDepartmentSafety = {
    allergiesSummary: resume.allergiesSummary || (resume.allergiesList.length > 0 ? resume.allergiesList.map(a => `${a.allergen} (${a.reaction})`).join(", ") : "No known drug/food allergies recorded"),
    activeMedicationsSummary: resume.medications.length > 0
      ? resume.medications.map((m) => `${m.medicine}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` · ${m.frequency}` : ""}`).join(", ")
      : resume.importantInfo.currentMedications || "No active medications recorded",
    criticalNotes: [
      ...(resume.allergiesList.length > 0 ? [`Allergy Alert: ${resume.allergiesList.map(a => a.allergen).join(", ")}`] : []),
      ...(resume.medications.some(m => m.medicine.toLowerCase().includes("aspirin") || m.medicine.toLowerCase().includes("warfarin") || m.medicine.toLowerCase().includes("clopidogrel"))
        ? ["Bleeding Precaution: Patient on antiplatelet / anticoagulant therapy"]
        : []),
      ...(resume.importantInfo.chronicConditions ? [`Chronic Conditions: ${resume.importantInfo.chronicConditions}`] : [])
    ]
  };

  // 5. Prioritize Records (Newest-first preserved within prioritized match and non-match partitions)
  const isMatch = (text: string) => isTextRelevantToDepartment(text, dept);

  const prioritizedDiagnoses = [...resume.diagnoses]
    .map((d) => ({ ...d, isDepartmentFocus: isMatch(`${d.condition} ${d.details}`) }))
    .sort((a, b) => {
      if (a.isDepartmentFocus && !b.isDepartmentFocus) return -1;
      if (!a.isDepartmentFocus && b.isDepartmentFocus) return 1;
      return (b.date || "").localeCompare(a.date || "");
    });

  const prioritizedMedications = [...resume.medications]
    .map((m) => ({ ...m, isDepartmentFocus: isMatch(`${m.medicine} ${m.purpose}`) }))
    .sort((a, b) => {
      if (a.isDepartmentFocus && !b.isDepartmentFocus) return -1;
      if (!a.isDepartmentFocus && b.isDepartmentFocus) return 1;
      return a.medicine.localeCompare(b.medicine);
    });

  const prioritizedTestReports = [...resume.testReports]
    .map((t) => ({ ...t, isDepartmentFocus: isMatch(`${t.testName} ${t.result}`) }))
    .sort((a, b) => {
      if (a.isDepartmentFocus && !b.isDepartmentFocus) return -1;
      if (!a.isDepartmentFocus && b.isDepartmentFocus) return 1;
      return (b.date || "").localeCompare(a.date || "");
    });

  const prioritizedSurgeries = [...resume.surgeries]
    .map((s) => ({ ...s, isDepartmentFocus: isMatch(`${s.procedure} ${s.details}`) }))
    .sort((a, b) => {
      if (a.isDepartmentFocus && !b.isDepartmentFocus) return -1;
      if (!a.isDepartmentFocus && b.isDepartmentFocus) return 1;
      return (b.date || "").localeCompare(a.date || "");
    });

  const customization: DepartmentCustomization = {
    departmentId: dept.id,
    departmentName: dept.name,
    departmentShortName: dept.shortName,
    departmentIcon: dept.icon,
    focusArea: dept.focusArea,
    detectedPatterns: patterns,
    patternsDisclaimer: "Note: Insights and patterns are summarized from user-uploaded records rather than a clinical diagnosis.",
    disclaimer: "Note: Insights and patterns are summarized from user-uploaded records rather than a clinical diagnosis.",
    crossDepartmentSafety
  };

  return {
    customization,
    prioritizedDiagnoses,
    prioritizedMedications,
    prioritizedTestReports,
    prioritizedSurgeries
  };
}
