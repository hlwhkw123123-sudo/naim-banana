
import { GoogleGenAI, Modality } from "@google/genai";

// IMPORTANT: Replace with your actual logic to get the API key.
// In a real app, this would be handled on a secure backend server, not in the frontend.
// The key is read from environment variables for development.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Using mocked API.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Edits an image using a text prompt with the Gemini 2.5 Flash Image model.
 * @param base64ImageData The base64-encoded image data (without the data URI prefix).
 * @param mimeType The MIME type of the image (e.g., 'image/png').
 * @param prompt The text prompt describing the desired edit.
 * @returns A promise that resolves to the new base64-encoded image data.
 */
export const editImageWithGemini = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  // --- MOCKED IMPLEMENTATION for frontend development without API key ---
  if (!API_KEY) {
    console.log("Mocking Gemini API call. Returning original image.");
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(base64ImageData); // Simulates API delay and returns the original image
      }, 2000);
    });
  }

  // --- REAL GEMINI API IMPLEMENTATION ---
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        // The response must be an image.
        responseModalities: [Modality.IMAGE],
      },
    });

    // Find the image part in the response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image data found in the Gemini API response.");

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("The AI model failed to process the image. Please try again.");
  }
};
