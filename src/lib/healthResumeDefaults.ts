import { HealthResumeData } from "@/types";

export function createEmptyHealthResume(name = "", phone = ""): HealthResumeData {
  return {
    fullName: name,
    age: "",
    gender: "",
    dob: "",
    dobRaw: "",
    bloodGroup: "",
    heightCm: "",
    weightKg: "",
    bmi: "",
    bmiCategory: "",
    patientId: phone,
    abhaId: "",
    abhaAddress: "",
    phone,
    email: "",
    location: "",
    allergiesSummary: "",
    profilePhotoUrl: undefined,
    userProfilePic: undefined,
    vitals: {
      bloodPressure: "",
      bloodPressureStatus: "",
      heartRate: "",
      heartRateStatus: "",
      spo2: "",
      spo2Status: "",
      temperature: "",
      temperatureStatus: ""
    },
    importantInfo: {
      allergies: "",
      chronicConditions: "",
      currentMedications: "",
      lifestyleNotes: ""
    },
    medicalTimeline: [],
    diagnoses: [],
    medications: [],
    allergiesList: [],
    testReports: [],
    immunizations: [],
    surgeries: [],
    lifestyle: {
      smoking: "",
      alcohol: "",
      exercise: "",
      familyHistory: ""
    },
    confirmation: {
      isConfirmed: false,
      statement: "",
      patientSignature: "",
      signatureDate: ""
    }
  };
}
