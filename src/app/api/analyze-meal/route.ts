import { GoogleGenerativeAI } from "@google/generative-ai";

const prompt =
  'Analyze this food image. Estimate the nutritional content. You must return ONLY a raw, valid JSON object without markdown formatting. Use these exact keys: "itemName" (string), "calories" (number), "protein" (number), "carbs" (number), "fats" (number).';
const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBase64Length = 14_000_000;

function isMealAnalysis(value: unknown): value is {
  itemName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "itemName" in value &&
    typeof value.itemName === "string" &&
    value.itemName.trim().length > 0 &&
    "calories" in value &&
    typeof value.calories === "number" &&
    Number.isFinite(value.calories) &&
    value.calories >= 0 &&
    "protein" in value &&
    typeof value.protein === "number" &&
    Number.isFinite(value.protein) &&
    value.protein >= 0 &&
    "carbs" in value &&
    typeof value.carbs === "number" &&
    Number.isFinite(value.carbs) &&
    value.carbs >= 0 &&
    "fats" in value &&
    typeof value.fats === "number" &&
    Number.isFinite(value.fats) &&
    value.fats >= 0
  );
}

export async function POST(request: Request) {
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    typeof requestBody !== "object" ||
    requestBody === null ||
    !("image" in requestBody) ||
    typeof requestBody.image !== "string" ||
    !("mimeType" in requestBody) ||
    typeof requestBody.mimeType !== "string"
  ) {
    return Response.json({ error: "An encoded image and MIME type are required." }, { status: 400 });
  }

  const { image, mimeType } = requestBody;
  if (!supportedMimeTypes.has(mimeType)) {
    return Response.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 415 });
  }
  if (
    image.length === 0 ||
    image.length > maxBase64Length ||
    image.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(image)
  ) {
    return Response.json({ error: "The image data is invalid or too large." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured.");
    return Response.json({ error: "Meal analysis is not configured. Please try again later." }, { status: 500 });
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    const result = await model.generateContent([
      { inlineData: { data: image, mimeType } },
      prompt
    ]);

    let analysis: unknown;
    try {
      analysis = JSON.parse(result.response.text());
    } catch {
      console.error("Gemini returned invalid JSON for meal analysis.");
      return Response.json({ error: "Meal analysis returned an unreadable response. Please try again." }, { status: 502 });
    }

    if (!isMealAnalysis(analysis)) {
      console.error("Gemini returned an invalid meal analysis shape.");
      return Response.json({ error: "Meal analysis returned incomplete nutrition data. Please try again." }, { status: 502 });
    }

    return Response.json({
      itemName: analysis.itemName.trim(),
      calories: analysis.calories,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fats: analysis.fats
    });
  } catch {
    console.error("Gemini meal analysis request failed.");
    return Response.json({ error: "Meal analysis failed. Please try again." }, { status: 502 });
  }
}
