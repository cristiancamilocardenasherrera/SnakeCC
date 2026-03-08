import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getJungleCommentary(event: string, score: number) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a dramatic jungle narrator. Provide a very short (max 15 words) commentary for a 3D Anaconda game. 
      The event is: ${event}. The current score is: ${score}. 
      Make it feel like a nature documentary.`,
    });
    return response.text || "The jungle remains silent...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The predator strikes in silence.";
  }
}

export async function getJungleFact() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Tell me one interesting and short fact about Anacondas in the wild. Max 20 words.",
    });
    return response.text || "Anacondas are the heaviest snakes in the world.";
  } catch (error) {
    return "Anacondas can grow up to 30 feet long.";
  }
}
