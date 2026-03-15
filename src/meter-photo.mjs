/**
 * Meter photo OCR via external AI vision API.
 * All connection details are taken from config — nothing is hardcoded.
 */
import { parse as parseExif } from "exifr";

export const defaultMeterPhotoConfig = {
  meterPhoto: {
    enabled: false,
    vision: {
      apiKey: "${first(env.VISION_API_KEY,'')}",
      apiEndpoint:
        "${first(env.VISION_API_ENDPOINT,'https://generativelanguage.googleapis.com/v1beta')}",
      model: "${first(env.VISION_API_MODEL,'gemini-2.0-flash')}",
      prompt:
        "${first(env.VISION_API_PROMPT,'Read the meter display in this image and return only the numeric value with decimal point. No units, no text, just the number.')}",
      maxOutputTokens: 64,
      temperature: 0
    }
  }
};

/**
 * Extract the capture date from image EXIF data.
 * Returns an ISO 8601 string or null if no date is found.
 *
 * @param {Buffer} imageBuffer
 * @returns {Promise<string|null>}
 */
export async function extractExifDate(imageBuffer) {
  try {
    const exif = await parseExif(imageBuffer, {
      pick: ["DateTimeOriginal", "CreateDate", "DateTimeDigitized", "DateTime"]
    });

    const date =
      exif?.DateTimeOriginal ??
      exif?.CreateDate ??
      exif?.DateTimeDigitized ??
      exif?.DateTime ??
      null;

    return date instanceof Date ? date.toISOString() : null;
  } catch {
    return null;
  }
}

/**
 * Send an image to the configured AI vision API and return the recognized meter value.
 * Runs EXIF date extraction and AI recognition in parallel.
 *
 * @param {object} config - the meterPhoto config section
 * @param {string} imageBase64 - base64-encoded image data
 * @param {string} mimeType - MIME type of the image (e.g. "image/jpeg")
 * @returns {Promise<{value: string, raw: string, date: string|null}>}
 */
export async function recognizeMeterValue(config, imageBase64, mimeType) {
  const { apiKey, apiEndpoint, model, prompt, maxOutputTokens, temperature } =
    config.vision;

  const imageBuffer = Buffer.from(imageBase64, "base64");

  const visionRequest = fetch(
    `${apiEndpoint}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: imageBase64 } }
            ]
          }
        ],
        generationConfig: { maxOutputTokens, temperature }
      })
    }
  );

  // Run EXIF extraction and AI call in parallel
  const [date, response] = await Promise.all([
    extractExifDate(imageBuffer),
    visionRequest
  ]);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vision API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  // Extract the first number (with optional decimal point) from the response
  const match = raw.match(/[\d]+([.,][\d]+)?/);
  const value = match ? match[0].replace(",", ".") : raw;

  return { value, raw, date };
}
