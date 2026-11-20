export interface SymptomVoiceExtraction {
  symptomText: string;
  severity: "mild" | "moderate" | "severe";
  medicine?: string;
  medicineDose?: string;
  notes?: string;
  matchingChips: string[];
  rawTranscript: string;
}

export const COMMON_SYMPTOM_CHIP_LABELS = [
  "Fever",
  "Cough",
  "Body Ache",
  "Breathlessness",
  "Headache",
  "Sore Throat",
  "Nausea",
  "Fatigue"
] as const;

export type CommonSymptomChipLabel = (typeof COMMON_SYMPTOM_CHIP_LABELS)[number];

interface ChipKeywordMapping {
  chip: CommonSymptomChipLabel;
  englishTitle: string;
  keywords: string[];
}

const CHIP_MAPPINGS: ChipKeywordMapping[] = [
  {
    chip: "Fever",
    englishTitle: "Fever",
    keywords: ["fever", "bukhar", "bukhar hai", "taap", "temperature", "chills", "febrile", "pyrexia"]
  },
  {
    chip: "Cough",
    englishTitle: "Cough",
    keywords: ["cough", "khansi", "khasi", "phlegm", "balgam", "coughing", "dry cough", "wet cough"]
  },
  {
    chip: "Body Ache",
    englishTitle: "Body Ache",
    keywords: ["body ache", "badan dard", "body pain", "ang dard", "muscle pain", "joint pain", "myalgia", "haath pair dard", "kamar dard"]
  },
  {
    chip: "Breathlessness",
    englishTitle: "Breathlessness / Dyspnea",
    keywords: ["breathlessness", "shortness of breath", "saans", "saans phoolna", "saans lene", "wheezing", "asthma", "dyspnea", "chest tight"]
  },
  {
    chip: "Headache",
    englishTitle: "Headache",
    keywords: ["headache", "sir dard", "sar dard", "matha dard", "migraine", "heavy head", "cephalalgia"]
  },
  {
    chip: "Sore Throat",
    englishTitle: "Sore Throat",
    keywords: ["sore throat", "throat pain", "gala dard", "gale me dard", "gala kharab", "kharrash", "pharyngitis", "hoarse"]
  },
  {
    chip: "Nausea",
    englishTitle: "Nausea & Gastrointestinal",
    keywords: ["nausea", "ulti", "vomiting", "vomit", "ji ghabrana", "pet dard", "stomach ache", "loose motion", "diarrhea", "acidity"]
  },
  {
    chip: "Fatigue",
    englishTitle: "Fatigue & Weakness",
    keywords: ["fatigue", "thakan", "thakaan", "kamzori", "weakness", "lethargy", "exhaustion", "tiredness", "sust"]
  }
];

const COMMON_MEDICINES = [
  "Paracetamol",
  "Dolo",
  "Crocin",
  "Calpol",
  "Combiflam",
  "Meftal",
  "Ibuprofen",
  "Cetirizine",
  "Allegra",
  "Montair",
  "Okacet",
  "Avil",
  "Asthalin",
  "Budecort",
  "Foracort",
  "Inhaler",
  "Duolin",
  "Azithromycin",
  "Augmentin",
  "Amoxicillin",
  "Cifran",
  "Taxim",
  "Pan 40",
  "Pantocid",
  "Omez",
  "Rantac",
  "Digene",
  "Gelusil",
  "Benadryl",
  "Ascoril",
  "Grilinctus",
  "Alex"
];

/**
 * Heuristically extracts structured symptom and medication fields from natural speech
 * in English or Hinglish/Hindi phrasing. Used as a fast instant parser and offline fallback.
 */
export function extractSymptomVoiceHeuristic(transcript: string): SymptomVoiceExtraction {
  const clean = transcript.trim();
  const lower = clean.toLowerCase();

  // 1. Detect matching chips and symptoms
  const matchedChips: string[] = [];
  const detectedSymptomTitles: string[] = [];

  for (const mapping of CHIP_MAPPINGS) {
    const isMatched = mapping.keywords.some((kw) => lower.includes(kw));
    if (isMatched) {
      if (!matchedChips.includes(mapping.chip)) {
        matchedChips.push(mapping.chip);
      }
      if (!detectedSymptomTitles.includes(mapping.englishTitle)) {
        detectedSymptomTitles.push(mapping.englishTitle);
      }
    }
  }

  // 2. Severity detection
  let severity: "mild" | "moderate" | "severe" = "moderate";
  const severeKeywords = [
    "severe",
    "very high",
    "bohot tez",
    "tez bukhar",
    "tez dard",
    "unbearable",
    "extreme",
    "acute",
    "102",
    "103",
    "104",
    "bohot zyada",
    "bahut jyada",
    "bura haal"
  ];
  const mildKeywords = [
    "mild",
    "slight",
    "halka",
    "halka sa",
    "thoda sa",
    "thoda",
    "low grade",
    "minor",
    "normal",
    "just started"
  ];

  if (severeKeywords.some((w) => lower.includes(w))) {
    severity = "severe";
  } else if (mildKeywords.some((w) => lower.includes(w))) {
    severity = "mild";
  }

  // 3. Medicine detection
  let detectedMedicine = "";
  for (const med of COMMON_MEDICINES) {
    const medLower = med.toLowerCase();
    if (lower.includes(medLower)) {
      detectedMedicine = med;
      break;
    }
  }

  // If specific medicine not matched, check general medication phrasing
  if (!detectedMedicine) {
    if (lower.includes("tablet") || lower.includes("goli") || lower.includes("dawa") || lower.includes("medicine")) {
      const match = clean.match(/(?:took|taken|li thi|li hai|goli|tablet|dawa)\s+([A-Za-z0-9\-]+)/i);
      if (match && match[1] && !["the", "a", "an", "ek", "do"].includes(match[1].toLowerCase())) {
        detectedMedicine = match[1];
      }
    }
  }

  // 4. Medicine dose and timing
  let detectedDose = "";
  const dosePatterns = [
    /(\d+\s*mg)/i,
    /(\d+\s*(?:puffs?|tablet|tablets|goli|drops?|ml|spoon))/i,
    /(ek\s+goli|do\s+goli|do\s+puff|ek\s+puff)/i,
    /(subah\s*(?:aur\s*shaam)?|shaam\s*ko|raat\s*me|after\s*food|post\s*(?:dinner|lunch)|empty\s*stomach|bedtime|sos)/i
  ];

  const doseMatches: string[] = [];
  for (const pattern of dosePatterns) {
    const m = clean.match(pattern);
    if (m && m[1]) {
      doseMatches.push(m[1].trim());
    }
  }
  if (doseMatches.length > 0) {
    detectedDose = doseMatches.join(", ");
  }

  // 5. Build clinical symptom description
  let symptomText = "";
  if (detectedSymptomTitles.length > 0) {
    const prefix = severity === "severe" ? "Severe " : severity === "mild" ? "Mild " : "";
    symptomText = `${prefix}${detectedSymptomTitles.join(", ")}`;
  } else if (clean.length > 0) {
    // If no chip keywords found, summarize user's speech directly
    symptomText = clean.length > 60 ? `${clean.slice(0, 57)}...` : clean;
  } else {
    symptomText = "Unusual symptom recorded";
  }

  // 6. Context notes
  const notesParts: string[] = [];
  if (lower.includes("kal se") || lower.includes("since yesterday") || lower.includes("kal raat")) {
    notesParts.push("Duration: Started yesterday / last night");
  } else if (lower.includes("subah se") || lower.includes("since morning")) {
    notesParts.push("Duration: Since morning");
  } else if (lower.includes("do din") || lower.includes("2 days") || lower.includes("3 days") || lower.includes("teen din")) {
    notesParts.push("Duration: Past 2-3 days");
  }

  if (lower.includes("rain") || lower.includes("baarish") || lower.includes("dust") || lower.includes("dhool") || lower.includes("cold")) {
    notesParts.push("Possible trigger: Environmental / weather exposure");
  }

  // Always include the transcript reference if it provides rich context
  if (clean.length > 0) {
    notesParts.push(`Spoken note: "${clean}"`);
  }

  return {
    symptomText,
    severity,
    medicine: detectedMedicine || undefined,
    medicineDose: detectedDose || undefined,
    notes: notesParts.join(" | ") || undefined,
    matchingChips: matchedChips,
    rawTranscript: clean
  };
}
