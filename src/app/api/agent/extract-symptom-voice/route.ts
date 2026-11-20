import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractSymptomVoiceHeuristic } from "@/lib/symptomVoiceParser";

function cleanJsonText(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) return match[1].trim();
  return raw.trim();
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let transcript = "";
    let audioBuffer: Buffer | null = null;
    let audioMimeType = "audio/webm";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audioField = formData.get("audio");
      if (audioField && typeof (audioField as Blob).arrayBuffer === "function") {
        const blob = audioField as Blob;
        const arrayBuffer = await blob.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
        audioMimeType = blob.type ? blob.type.split(";")[0] : "audio/webm";
      }
      const rawText = formData.get("transcript");
      if (typeof rawText === "string") {
        transcript = rawText.trim();
      }
    } else {
      const body = await request.json().catch(() => ({}));
      if (typeof body.transcript === "string") {
        transcript = body.transcript.trim();
      }
    }

    if (!transcript && !audioBuffer) {
      return NextResponse.json(
        {
          success: false,
          error: "No speech transcript or audio recording provided."
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If Gemini is not configured, fallback to heuristic parser if transcript is available
    if (!apiKey) {
      if (transcript) {
        const heuristic = extractSymptomVoiceHeuristic(transcript);
        return NextResponse.json({
          success: true,
          transcript,
          ...heuristic
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY is not configured for direct audio transcription."
        },
        { status: 200 }
      );
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        ...({ thinkingConfig: { thinkingBudget: 0 } } as Record<string, unknown>)
      } as Record<string, unknown>
    });

    const systemInstruction = `
You are an expert clinical conversational AI assistant for Healthysis.
A patient is recording or speaking their symptoms, severity, and any medicines taken.
The speech may be in English, Hindi, or Hinglish (Hindi words mixed with English or written in Latin/Roman script, e.g. "kal se tez bukhar aur gale me dard hai, subah dolo 650 li thi").

Extract the details accurately and output a JSON object with EXACTLY these fields:
- "transcript": The transcribed speech in English or Romanized text.
- "symptomText": Clean clinical summary of the symptoms in English (e.g. "High fever and sore throat", "Mild dry cough with fatigue", "Severe breathlessness").
- "severity": Must be exactly one of: "mild", "moderate", "severe".
  - "severe" if: severe, very high, unbearable, acute, "bohot tez", "tez bukhar", "102+", "bura haal".
  - "mild" if: mild, slight, "halka", "thoda sa", low-grade, minor.
  - "moderate" if standard or unspecified.
- "medicine": Name of any medication taken (e.g. "Dolo", "Paracetamol", "Cetirizine", "Asthalin inhaler", "Pan 40", "Combiflam"). Return "" if none mentioned.
- "medicineDose": Dosage, frequency, or timing if mentioned (e.g. "650mg post-lunch", "2 puffs SOS", "1 tablet bedtime"). Return "" if none mentioned.
- "notes": Any triggers, duration, or context (e.g. "Duration: Started last night after rain"). If there are speech nuances not captured in symptomText or medicine, include them here along with the spoken context. Return "" if none.
- "matchingChips": Array of strings matching ANY of these exact labels if applicable:
  ["Fever", "Cough", "Body Ache", "Breathlessness", "Headache", "Sore Throat", "Nausea", "Fatigue"]
`;

    let promptContents: unknown[];

    if (audioBuffer) {
      promptContents = [
        {
          inlineData: {
            mimeType: audioMimeType,
            data: audioBuffer.toString("base64")
          }
        },
        {
          text: `${systemInstruction}\n\nTask: Transcribe the audio recording, extract symptoms, severity, medications, and matching chips according to the schema.`
        }
      ];
    } else {
      promptContents = [
        {
          text: `${systemInstruction}\n\nSpoken Patient Input:\n"${transcript}"\n\nTask: Extract symptoms, severity, medications, and matching chips according to the schema.`
        }
      ];
    }

    const response = await model.generateContent(promptContents as Parameters<typeof model.generateContent>[0]);
    const responseText = response.response.text();
    const parsed = JSON.parse(cleanJsonText(responseText));

    return NextResponse.json({
      success: true,
      transcript: parsed.transcript || transcript,
      symptomText: parsed.symptomText || transcript,
      severity: parsed.severity === "mild" || parsed.severity === "severe" ? parsed.severity : "moderate",
      medicine: parsed.medicine || undefined,
      medicineDose: parsed.medicineDose || undefined,
      notes: parsed.notes || undefined,
      matchingChips: Array.isArray(parsed.matchingChips) ? parsed.matchingChips : []
    });
  } catch (error: unknown) {
    console.error("Voice symptom extraction API error:", error);
    // If request has transcript, fallback to heuristic extraction
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Voice extraction failed"
    }, { status: 200 });
  }
}
