import { DepartmentId } from "@/types";

export interface DepartmentCatalogItem {
  id: DepartmentId;
  name: string;
  shortName: string;
  focusArea: string;
  icon: string;
  color: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  };
  keywords: string[];
  vitalPriorities: string[];
  biomarkerKeywords: string[];
  medicationKeywords: string[];
  symptomKeywords: string[];
  dietKeywords: string[];
  surgeryKeywords: string[];
}

export const DEPARTMENT_CATALOG: DepartmentCatalogItem[] = [
  {
    id: "all",
    name: "General Health / Comprehensive",
    shortName: "All",
    focusArea: "Comprehensive review across all clinical departments & physiological systems",
    icon: "📋",
    color: {
      bg: "bg-teal-600",
      text: "text-teal-700",
      border: "border-teal-200",
      badgeBg: "bg-teal-50",
      badgeText: "text-teal-800"
    },
    keywords: [],
    vitalPriorities: ["bloodPressure", "heartRate", "spo2", "temperature"],
    biomarkerKeywords: ["Blood glucose", "HbA1c", "Total cholesterol", "Hemoglobin", "TSH", "Vitamin D"],
    medicationKeywords: [],
    symptomKeywords: [],
    dietKeywords: [],
    surgeryKeywords: []
  },
  {
    id: "orthopedics",
    name: "Orthopedics",
    shortName: "Ortho",
    focusArea: "Bones, joints, ligaments, tendons, fractures, and spine issues",
    icon: "🦴",
    color: {
      bg: "bg-amber-600",
      text: "text-amber-700",
      border: "border-amber-200",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-800"
    },
    keywords: [
      "bone", "joint", "ligament", "tendon", "fracture", "spine", "spinal", "knee", "hip", "shoulder",
      "ankle", "wrist", "back pain", "arthritis", "osteoarthritis", "osteoporosis", "cervical", "lumbar",
      "spondylosis", "disc", "herniat", "gout", "uric acid", "calcium", "ortho", "musculoskeletal", "dexa"
    ],
    vitalPriorities: ["weightKg", "bmi", "bloodPressure"],
    biomarkerKeywords: ["Calcium", "Vitamin D", "Uric acid", "ESR", "CRP", "Alkaline Phosphatase", "Anti-CCP", "RF"],
    medicationKeywords: ["calcium", "vitamin d", "nsaid", "paracetamol", "tramadol", "ibuprofen", "etoricoxib", "glucosamine", "collagen", "muscle relaxant"],
    symptomKeywords: ["joint pain", "back pain", "knee pain", "stiffness", "swelling", "fracture", "mobility", "limping", "neck pain"],
    dietKeywords: ["calcium", "protein", "dairy", "anti-inflammatory", "weight management"],
    surgeryKeywords: ["arthroscopy", "replacement", "reduction", "fixation", "spine", "laminectomy", "implant", "discectomy"]
  },
  {
    id: "dentistry",
    name: "Dentistry",
    shortName: "Dental",
    focusArea: "Teeth, gums, oral surgery, and jaw disorders",
    icon: "🦷",
    color: {
      bg: "bg-cyan-600",
      text: "text-cyan-700",
      border: "border-cyan-200",
      badgeBg: "bg-cyan-50",
      badgeText: "text-cyan-800"
    },
    keywords: [
      "dental", "teeth", "tooth", "gum", "gingiv", "periodont", "molar", "oral", "jaw", "tmj", "cavity",
      "caries", "root canal", "crown", "bridge", "implant", "extraction", "plaque", "tartar", "enamel",
      "dentin", "orthodontic", "braces", "halitosis", "mouth"
    ],
    vitalPriorities: ["bloodPressure"],
    biomarkerKeywords: ["Bleeding time", "Clotting time", "Platelet", "Blood glucose", "HbA1c"],
    medicationKeywords: ["amoxicillin", "metronidazole", "chlorhexidine", "analgesic", "ibuprofen", "paracetamol", "antibiotic", "mouthwash"],
    symptomKeywords: ["toothache", "gum bleeding", "sensitivity", "jaw pain", "swollen gum", "bad breath", "difficulty chewing"],
    dietKeywords: ["sugar", "acidic", "soft foods", "cold liquids"],
    surgeryKeywords: ["root canal", "extraction", "wisdom tooth", "implant", "gingivectomy", "maxillofacial"]
  },
  {
    id: "cardiology",
    name: "Cardiology",
    shortName: "Cardio",
    focusArea: "Heart conditions, blood pressure, and blood vessels",
    icon: "❤️",
    color: {
      bg: "bg-rose-600",
      text: "text-rose-700",
      border: "border-rose-200",
      badgeBg: "bg-rose-50",
      badgeText: "text-rose-800"
    },
    keywords: [
      "heart", "cardio", "blood pressure", "bp", "systolic", "diastolic", "pulse", "hypertension", "hypotension",
      "cholesterol", "lipid", "ldl", "hdl", "triglycerides", "coronary", "artery", "cardiac", "arrhythmia", "ecg",
      "ekg", "echo", "troponin", "angina", "chest pain", "palpitation", "valve", "myocardial", "stent", "angioplasty"
    ],
    vitalPriorities: ["bloodPressure", "heartRate", "spo2", "bmi"],
    biomarkerKeywords: ["Systolic BP", "Diastolic BP", "Heart rate", "Total cholesterol", "LDL", "HDL", "Triglycerides", "Troponin", "hs-CRP", "Homocysteine", "BNP"],
    medicationKeywords: ["statin", "atorvastatin", "rosuvastatin", "amlodipine", "telmisartan", "losartan", "metoprolol", "atenolol", "aspirin", "clopidogrel", "beta blocker", "ace inhibitor"],
    symptomKeywords: ["chest pain", "palpitations", "shortness of breath", "dizziness", "lightheaded", "ankle swelling", "fatigue"],
    dietKeywords: ["low sodium", "salt", "saturated fat", "trans fat", "omega-3", "caffeine", "dash diet"],
    surgeryKeywords: ["angioplasty", "cabg", "bypass", "stent", "pacemaker", "valve repair", "angiography"]
  },
  {
    id: "neurology",
    name: "Neurology",
    shortName: "Neuro",
    focusArea: "Brain, spinal cord, nerves, strokes, and migraines",
    icon: "🧠",
    color: {
      bg: "bg-indigo-600",
      text: "text-indigo-700",
      border: "border-indigo-200",
      badgeBg: "bg-indigo-50",
      badgeText: "text-indigo-800"
    },
    keywords: [
      "neuro", "brain", "nerve", "spinal cord", "stroke", "tia", "migraine", "headache", "seizure", "epilepsy",
      "neuropathy", "vertigo", "tremor", "parkinson", "memory", "dementia", "cognitive", "eeg", "mri brain", "ct head",
      "numbness", "tingling", "paralysis", "b12", "reflex"
    ],
    vitalPriorities: ["bloodPressure", "heartRate", "temperature"],
    biomarkerKeywords: ["Vitamin B12", "Folate", "Blood glucose", "Electrolytes", "ESR", "CSF"],
    medicationKeywords: ["pregabalin", "gabapentin", "triptan", "topiramate", "valproate", "levetiracetam", "carbamazepine", "b12", "methylcobalamin"],
    symptomKeywords: ["migraine", "headache", "dizziness", "numbness", "tingling", "tremor", "memory lapse", "seizure", "unsteady", "weakness"],
    dietKeywords: ["magnesium", "hydration", "caffeine triggers", "fasting", "b-vitamins"],
    surgeryKeywords: ["craniotomy", "shunt", "nerve decompression", "deep brain stimulation", "spine surgery"]
  },
  {
    id: "gastroenterology",
    name: "Gastroenterology",
    shortName: "Gastro",
    focusArea: "Digestive system (stomach, intestines, liver, pancreas)",
    icon: "🫁",
    color: {
      bg: "bg-emerald-600",
      text: "text-emerald-700",
      border: "border-emerald-200",
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-800"
    },
    keywords: [
      "gastro", "digest", "stomach", "intestine", "bowel", "liver", "pancreas", "gallbladder", "gerd", "acid reflux",
      "acidity", "gastritis", "ulcer", "lft", "sgot", "sgpt", "bilirubin", "endoscopy", "colonoscopy", "bloating",
      "nausea", "vomiting", "diarrhea", "constipation", "ibs", "ibd", "crohn", "colitis", "celiac", "fatty liver"
    ],
    vitalPriorities: ["weightKg", "bmi", "temperature"],
    biomarkerKeywords: ["SGOT", "SGPT", "Total Bilirubin", "Direct Bilirubin", "Alkaline Phosphatase", "Amylase", "Lipase", "Albumin", "Total Protein"],
    medicationKeywords: ["pantoprazole", "omeprazole", "rabeprazole", "antacid", "probiotic", "mesalamine", "laxative", "domperidone", "ondansetron", "sucralfate"],
    symptomKeywords: ["acidity", "heartburn", "bloating", "abdominal pain", "nausea", "vomiting", "diarrhea", "constipation", "indigestion", "cramps"],
    dietKeywords: ["fiber", "spicy food", "oily food", "late dinner", "gluten", "lactose", "probiotic", "meal timing"],
    surgeryKeywords: ["endoscopy", "colonoscopy", "cholecystectomy", "appendectomy", "hernia repair", "polypectomy"]
  },
  {
    id: "pulmonology",
    name: "Pulmonology",
    shortName: "Pulmo / Chest",
    focusArea: "Lungs, airways, asthma, and breathing disorders",
    icon: "🫁",
    color: {
      bg: "bg-sky-600",
      text: "text-sky-700",
      border: "border-sky-200",
      badgeBg: "bg-sky-50",
      badgeText: "text-sky-800"
    },
    keywords: [
      "pulmo", "lung", "chest", "airway", "respiratory", "asthma", "copd", "bronchitis", "pneumonia", "wheezing",
      "cough", "breath", "dyspnea", "spo2", "oxygen", "pft", "spirometry", "inhaler", "smoking", "tobacco",
      "sleep apnea", "chest x-ray", "hrct", "pleural"
    ],
    vitalPriorities: ["spo2", "heartRate", "respiratoryRate", "temperature"],
    biomarkerKeywords: ["SpO2", "IgE", "Absolute Eosinophil Count", "Hemoglobin", "Arterial Blood Gas"],
    medicationKeywords: ["inhaler", "budesonide", "formoterol", "salbutamol", "montelukast", "ipratropium", "tiotropium", "theophylline", "cough syrup", "steroid"],
    symptomKeywords: ["cough", "wheezing", "shortness of breath", "chest tightness", "phlegm", "breathlessness on exertion", "night cough"],
    dietKeywords: ["hydration", "anti-inflammatory", "warm fluids", "avoid cold foods"],
    surgeryKeywords: ["bronchoscopy", "thoracentesis", "pleural tap", "lobectomy"]
  },
  {
    id: "nephrology",
    name: "Nephrology",
    shortName: "Nephro",
    focusArea: "Kidneys, dialysis, and electrolyte balance",
    icon: "🫘",
    color: {
      bg: "bg-purple-600",
      text: "text-purple-700",
      border: "border-purple-200",
      badgeBg: "bg-purple-50",
      badgeText: "text-purple-800"
    },
    keywords: [
      "nephro", "kidney", "renal", "dialysis", "electrolyte", "creatinine", "egfr", "bun", "urea", "uric acid",
      "sodium", "potassium", "proteinuria", "albuminuria", "urine routine", "edema", "fluid retention", "ckd",
      "glomerulonephritis", "nephrotic", "renal artery"
    ],
    vitalPriorities: ["bloodPressure", "weightKg"],
    biomarkerKeywords: ["Serum Creatinine", "eGFR", "Blood Urea", "BUN", "Sodium", "Potassium", "Urine Protein", "Microalbumin", "Uric acid"],
    medicationKeywords: ["furosemide", "torsemide", "torasemide", "sodium bicarbonate", "phosphate binder", "telmisartan", "erythropoietin", "diuretic"],
    symptomKeywords: ["facial puffiness", "swelling in feet", "reduced urine", "foamy urine", "fatigue", "flank pain", "muscle cramps"],
    dietKeywords: ["low potassium", "low sodium", "protein controlled", "fluid restriction", "low phosphorus"],
    surgeryKeywords: ["dialysis fistula", "av fistula", "kidney biopsy", "renal transplant"]
  },
  {
    id: "urology",
    name: "Urology",
    shortName: "Uro",
    focusArea: "Urinary tract (bladder, kidneys) and male reproductive system",
    icon: "💧",
    color: {
      bg: "bg-blue-600",
      text: "text-blue-700",
      border: "border-blue-200",
      badgeBg: "bg-blue-50",
      badgeText: "text-blue-800"
    },
    keywords: [
      "uro", "urinary", "bladder", "kidney stone", "calculus", "prostate", "psa", "dysuria", "burning micturition",
      "hematuria", "frequency", "incontinence", "urethra", "testicular", "bph", "cystitis", "uti", "catheter"
    ],
    vitalPriorities: ["bloodPressure", "temperature"],
    biomarkerKeywords: ["PSA", "Urine Routine", "Urine Culture", "Serum Creatinine", "Uric acid"],
    medicationKeywords: ["tamsulosin", "finasteride", "alfuzosin", "nitrofurantoin", "fosfomycin", "urinary alkalizer", "potassium citrate"],
    symptomKeywords: ["burning urination", "frequent urination", "weak urinary stream", "blood in urine", "lower abdominal pain", "stone pain"],
    dietKeywords: ["hydration", "calcium oxalate", "low oxalate", "citrus fruits"],
    surgeryKeywords: ["lithotripsy", "ursl", "pcnl", "turp", "cystoscopy", "circumcision"]
  },
  {
    id: "dermatology",
    name: "Dermatology",
    shortName: "Derma",
    focusArea: "Skin, hair, and nail conditions",
    icon: "🧴",
    color: {
      bg: "bg-pink-600",
      text: "text-pink-700",
      border: "border-pink-200",
      badgeBg: "bg-pink-50",
      badgeText: "text-pink-800"
    },
    keywords: [
      "derma", "skin", "hair", "nail", "rash", "eczema", "dermatitis", "psoriasis", "acne", "itch", "pruritus",
      "fungal", "tinea", "alopecia", "hives", "urticaria", "lesion", "topical", "pigmentation", "vitiligo",
      "scabies", "melanoma", "dandruff"
    ],
    vitalPriorities: ["temperature"],
    biomarkerKeywords: ["IgE", "CBC", "Eosinophils", "Vitamin D", "Ferritin", "Biotin"],
    medicationKeywords: ["cetirizine", "levocetirizine", "fexofenadine", "clobetasol", "hydrocortisone", "isotretinoin", "ketoconazole", "minoxidil", "antihistamine", "ointment"],
    symptomKeywords: ["itching", "rash", "dry skin", "red patches", "flaking", "hair thinning", "scalp lesions", "nail discoloration"],
    dietKeywords: ["hydration", "dairy elimination", "low glycemic", "zinc", "antioxidants"],
    surgeryKeywords: ["skin biopsy", "mole removal", "cyst excision", "laser therapy"]
  },
  {
    id: "ophthalmology",
    name: "Ophthalmology",
    shortName: "Ophthal / Eye",
    focusArea: "Eyes, vision correction, cataracts, and glaucoma",
    icon: "👁️",
    color: {
      bg: "bg-teal-600",
      text: "text-teal-700",
      border: "border-teal-200",
      badgeBg: "bg-teal-50",
      badgeText: "text-teal-800"
    },
    keywords: [
      "ophthal", "eye", "vision", "cornea", "retina", "cataract", "glaucoma", "iop", "optic", "visual acuity",
      "macular", "conjunctivitis", "blur", "dryness", "spectacle", "fundus", "retinopathy", "lasik", "refraction"
    ],
    vitalPriorities: ["bloodPressure"],
    biomarkerKeywords: ["Blood glucose", "HbA1c", "Intraocular Pressure", "Lipid profile"],
    medicationKeywords: ["eye drops", "carboxymethylcellulose", "timolol", "latanoprost", "moxifloxacin", "lubricant eye drops", "brimonidine"],
    symptomKeywords: ["blurred vision", "dry eyes", "eye strain", "redness", "headache behind eyes", "floaters", "halos around lights"],
    dietKeywords: ["lutein", "zeaxanthin", "vitamin a", "omega-3"],
    surgeryKeywords: ["cataract surgery", "phacoemulsification", "lasik", "trabeculectomy", "vitrectomy"]
  },
  {
    id: "otolaryngology",
    name: "Otolaryngology",
    shortName: "ENT",
    focusArea: "Ear, nose, throat, sinuses, and balance disorders",
    icon: "👂",
    color: {
      bg: "bg-violet-600",
      text: "text-violet-700",
      border: "border-violet-200",
      badgeBg: "bg-violet-50",
      badgeText: "text-violet-800"
    },
    keywords: [
      "ent", "ear", "nose", "throat", "otolaryn", "sinus", "sinusitis", "tinnitus", "hearing", "audiometry",
      "tonsil", "pharynx", "larynx", "vocal", "vertigo", "balance", "nasal", "septum", "dns", "rhinitis",
      "otitis", "wax", "eardrum", "adenoid", "hoarseness"
    ],
    vitalPriorities: ["temperature"],
    biomarkerKeywords: ["IgE", "CBC", "ESR", "Throat swab"],
    medicationKeywords: ["nasal spray", "fluticasone", "azelastine", "ear drops", "decongestant", "amoxicillin", "betahistine", "antihistamine"],
    symptomKeywords: ["sinus headache", "nasal blockage", "ear discharge", "ringing in ear", "dizziness", "sore throat", "hoarse voice"],
    dietKeywords: ["hydration", "steam inhalation", "avoid cold dairy during congestion"],
    surgeryKeywords: ["tonsillectomy", "septoplasty", "fess", "tympanoplasty", "adenoidectomy"]
  },
  {
    id: "endocrinology",
    name: "Endocrinology",
    shortName: "Endo",
    focusArea: "Hormones, diabetes, thyroid, and metabolic disorders",
    icon: "🩸",
    color: {
      bg: "bg-orange-600",
      text: "text-orange-700",
      border: "border-orange-200",
      badgeBg: "bg-orange-50",
      badgeText: "text-orange-800"
    },
    keywords: [
      "endo", "hormone", "diabetes", "diabetic", "glucose", "fasting", "postprandial", "ppbg", "hba1c", "insulin",
      "thyroid", "tsh", "t3", "t4", "hypothyroidism", "hyperthyroidism", "metabolic", "pcos", "cortisol", "adrenal",
      "pituitary", "glycemic", "prediabetes", "c-peptide"
    ],
    vitalPriorities: ["bloodPressure", "weightKg", "bmi"],
    biomarkerKeywords: ["Blood glucose", "HbA1c", "TSH", "Free T3", "Free T4", "Vitamin D", "Lipid profile", "Cortisol", "Serum Insulin"],
    medicationKeywords: ["metformin", "glimepiride", "insulin", "dapagliflozin", "empagliflozin", "sitagliptin", "levothyroxine", "thyronorm", "eltroxin", "pioglitazone"],
    symptomKeywords: ["frequent urination", "excessive thirst", "unexplained fatigue", "weight gain", "weight loss", "cold intolerance", "hair loss"],
    dietKeywords: ["low glycemic index", "complex carbs", "sugar-free", "portion control", "fiber", "meal timing"],
    surgeryKeywords: ["thyroidectomy", "bariatric surgery"]
  },
  {
    id: "oncology",
    name: "Oncology",
    shortName: "Onco",
    focusArea: "Diagnosis and treatment of cancers and tumors",
    icon: "🎗️",
    color: {
      bg: "bg-red-600",
      text: "text-red-700",
      border: "border-red-200",
      badgeBg: "bg-red-50",
      badgeText: "text-red-800"
    },
    keywords: [
      "onco", "cancer", "tumor", "tumour", "neoplasm", "malignan", "carcinoma", "sarcoma", "lymphoma", "leukemia",
      "biopsy", "histopathology", "pet scan", "chemo", "radiation", "cea", "ca-125", "afp", "remission", "metastasis",
      "oncologist", "mass", "lesion"
    ],
    vitalPriorities: ["weightKg", "temperature", "bloodPressure", "heartRate"],
    biomarkerKeywords: ["CEA", "CA-125", "AFP", "PSA", "CBC", "ESR", "Hemoglobin", "Platelet count", "LDH"],
    medicationKeywords: ["chemotherapy", "tamoxifen", "anastrozole", "ondansetron", "filgrastim", "morphine", "immunotherapy"],
    symptomKeywords: ["unexplained weight loss", "persistent fatigue", "lump", "night sweats", "loss of appetite", "persistent pain"],
    dietKeywords: ["high protein", "caloric density", "small frequent meals", "hydration"],
    surgeryKeywords: ["biopsy", "tumor resection", "mastectomy", "lumpectomy", "lymph node dissection"]
  },
  {
    id: "psychiatry",
    name: "Psychiatry",
    shortName: "Psych",
    focusArea: "Mental health, mood disorders, and behavioral conditions",
    icon: "🧠",
    color: {
      bg: "bg-fuchsia-600",
      text: "text-fuchsia-700",
      border: "border-fuchsia-200",
      badgeBg: "bg-fuchsia-50",
      badgeText: "text-fuchsia-800"
    },
    keywords: [
      "psych", "mental", "mood", "anxiety", "depression", "bipolar", "panic", "stress", "sleep", "insomnia",
      "adhd", "behavioral", "ssri", "emotional", "burnout", "mental noise", "phobia", "psychiatrist", "psychology",
      "cognitive", "neurotrans"
    ],
    vitalPriorities: ["heartRate", "bloodPressure"],
    biomarkerKeywords: ["TSH", "Vitamin B12", "Vitamin D", "Cortisol", "Electrolytes"],
    medicationKeywords: ["escitalopram", "sertraline", "fluoxetine", "clonazepam", "alprazolam", "mirtazapine", "quetiapine", "zolpidem", "melatonin", "antidepressant"],
    symptomKeywords: ["anxiety", "insomnia", "panic attacks", "low mood", "restlessness", "racing thoughts", "poor concentration", "fatigue"],
    dietKeywords: ["caffeine reduction", "tryptophan foods", "regular meal schedule", "omega-3"],
    surgeryKeywords: []
  }
];

export function getDepartmentById(id: DepartmentId): DepartmentCatalogItem {
  const found = DEPARTMENT_CATALOG.find((d) => d.id === id);
  return found ?? DEPARTMENT_CATALOG[0];
}

/**
 * Concise option labels designed to avoid right-edge dropdown clipping on all screen sizes,
 * while the full focus area is prominently displayed inside the hero card itself.
 */
export function getConciseDepartmentLabel(dept: DepartmentCatalogItem): string {
  switch (dept.id) {
    case "all":
      return "General Health (All) — Comprehensive review";
    case "orthopedics":
      return "Orthopedics (Ortho) — Bones, joints & spine";
    case "dentistry":
      return "Dentistry (Dental) — Teeth, gums & jaw";
    case "cardiology":
      return "Cardiology (Cardio) — Heart, BP & vessels";
    case "neurology":
      return "Neurology (Neuro) — Brain, nerves & migraine";
    case "gastroenterology":
      return "Gastroenterology (Gastro) — Stomach, gut & liver";
    case "pulmonology":
      return "Pulmonology (Pulmo) — Lungs, chest & asthma";
    case "nephrology":
      return "Nephrology (Nephro) — Kidneys & electrolytes";
    case "urology":
      return "Urology (Uro) — Urinary tract & bladder";
    case "dermatology":
      return "Dermatology (Derma) — Skin, hair & nails";
    case "ophthalmology":
      return "Ophthalmology (Eye) — Eyes & vision";
    case "otolaryngology":
      return "ENT (Otolaryngology) — Ear, nose & throat";
    case "endocrinology":
      return "Endocrinology (Endo) — Hormones, diabetes & thyroid";
    case "oncology":
      return "Oncology (Onco) — Cancers & tumors";
    case "psychiatry":
      return "Psychiatry (Psych) — Mood & mental health";
    default:
      return `${dept.name} (${dept.shortName})`;
  }
}

export function isTextRelevantToDepartment(text: string, dept: DepartmentCatalogItem): boolean {
  if (dept.id === "all") return true;
  if (!text) return false;
  const lower = text.toLowerCase();
  return dept.keywords.some((kw) => lower.includes(kw.toLowerCase()));
}
