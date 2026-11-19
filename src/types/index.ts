export type Language = 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'hinglish';

export type NavigationTab = 
  | 'home' 
  | 'healthfolio' 
  | 'snap' 
  | 'find-doctors' 
  | 'user-profile' 
  | 'doctor-brief' 
  | 'truth-engine';

export interface DoctorReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
}

export interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  credentials: string;
  experienceYears: number;
  patientsCuredCount: string;
  ongoingTreatmentsCount?: string;
  rating: number;
  city: string;
  clinicAddress?: string;
  phone?: string;
  subspecialty?: string;
  consultationFee: string;
  feeNumber?: number;
  avatarInitials: string;
  avatarColor: string;
  imageUrl?: string;
  verified?: boolean;
  education?: string;
  hospitals?: string[];
  about?: string;
  reviews: DoctorReview[];
}

export type UserRole = 'patient' | 'doctor';

export interface AssessmentResult {
  category?: 'diabetes' | 'hypertension' | 'pcos' | 'burnout';
  categoryName?: string;
  categoryEmoji?: string;
  riskScore?: number;
  isElevated?: boolean;
  recommendedDoctor?: string;
  recommendedDoctorRole?: string;
  managesPrivately: boolean;
  habit?: string;
  tests?: string[];
  answers?: Record<string, boolean>;
  lunchEnergyScore?: number;
  mentalNoiseLevel?: 'Quiet & Calm' | 'Manageable' | 'Overwhelming' | 'Exhausting/Numb';
  poorSleepDays?: number;
}

export interface UserProfile {
  name: string;
  age: number;
  dob: string;
  height: string;
  weight: string;
  phone: string;
  role: UserRole;
  uniqueId: string; // HS-XXX for patients, DR-XXX for doctors
  language: Language;
  onboarded: boolean;
  createdAt: string;
  isHidingCondition: boolean;
  gender?: string;
  userProfilePic?: string;
  bmi?: number;
  bmiCategory?: string;
  wantsDietPlan?: boolean;
  mealSnappingCommitment?: boolean;
  decisionTreeData?: Record<string, unknown>;
  assessment?: AssessmentResult;
}

export interface DoctorBriefData {
  patientId: string;
  patientName: string;
  age: number;
  height: string;
  weight: string;
  generatedDate: string;
  monitoringPeriod: string;
  adherenceRate: number;
  glucoseSpikeEvents: number; // e.g. 4 events
  lateNightMealFrequency: string; // e.g. "12% of total dinners past 9:30 PM"
  stressCorrelation: string;
  topGlycemicTriggers: string[];
  stabilizingMeals: string[];
  clinicalObservations: string[];
  recommendedPhysicianActions: string[];
}

export interface MythCard {
  id: string;
  claim: string;
  source: 'WhatsApp Family Forward' | 'Instagram Viral Trend' | 'YouTube Short';
  verdict: 'FALSE' | 'MISLEADING' | 'CLINICALLY VERIFIED';
  verifiedDoctorFact: string;
  clinicalExplanation: string;
  medicalCitation: string;
  category: 'diet' | 'supplements' | 'lifestyle';
  whatsappShareText: string;
}

export interface HealthTimelineItem {
  id: string;
  date: string;
  title: string;
  facility: string;
  status: "Resolved" | "Ongoing" | "Normal";
}

export interface HealthDiagnosisItem {
  id: string;
  date: string;
  condition: string;
  details: string;
  status: "Resolved" | "Ongoing" | "Normal";
}

export interface HealthMedicationItem {
  id: string;
  medicine: string;
  dose: string;
  frequency: string;
  purpose: string;
}

export interface HealthAllergyItem {
  id: string;
  allergen: string;
  reaction: string;
}

export interface HealthTestReportItem {
  id: string;
  date: string;
  testName: string;
  result: string;
  file?: string;
}

export interface HealthImmunizationItem {
  id: string;
  vaccine: string;
  date: string;
}

export interface HealthSurgeryItem {
  id: string;
  date: string;
  procedure: string;
  details: string;
}

export interface HealthResumeData {
  // Personal Info
  fullName: string;
  age: number | string;
  gender: string;
  dob: string; // e.g. "14 Feb 2005"
  dobRaw?: string; // e.g. "2005-02-14"
  bloodGroup: string;
  heightCm: number | string;
  weightKg: number | string;
  bmi: number | string;
  bmiCategory?: string;
  patientId: string;
  abhaId?: string;
  abhaAddress?: string; // e.g. "suryansh@abdm"
  phone: string;
  email: string;
  location: string;
  allergiesSummary: string;
  profilePhotoUrl?: string;
  userProfilePic?: string;

  // Key Health Indicators (Latest)
  vitals: {
    bloodPressure: string;
    bloodPressureStatus?: string;
    heartRate: string;
    heartRateStatus?: string;
    spo2: string;
    spo2Status?: string;
    temperature: string;
    temperatureStatus?: string;
  };
  reportMetrics?: Record<string, string>;

  // Important Info
  importantInfo: {
    allergies: string;
    chronicConditions: string;
    currentMedications: string;
    lifestyleNotes: string;
  };

  // Medical Timeline
  medicalTimeline: HealthTimelineItem[];

  // Diagnoses & Medical History
  diagnoses: HealthDiagnosisItem[];

  // Medications & Allergies
  medications: HealthMedicationItem[];
  allergiesList: HealthAllergyItem[];

  // Recent Test Reports & Immunizations
  testReports: HealthTestReportItem[];
  immunizations: HealthImmunizationItem[];

  // Past Surgeries / Procedures
  surgeries: HealthSurgeryItem[];

  // Lifestyle & Family History
  lifestyle: {
    smoking: string;
    alcohol: string;
    exercise: string;
    familyHistory: string;
  };

  // Confirmation & Signature
  confirmation: {
    isConfirmed: boolean;
    statement: string;
    patientSignature: string;
    signatureDate: string;
  };
}
