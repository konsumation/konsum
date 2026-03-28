/**
 * Meter photo OCR via external AI vision API.
 * Uses OpenAI-compatible chat completions format (works with OpenRouter, OpenAI, Ollama, etc.)
 * All connection details are taken from config — nothing is hardcoded.
 */
import exifr from "exifr";

export const defaultMeterPhotoConfig = {
  meterPhoto: {
    vision: {
      apiKey: "${first(env.VISION_API_KEY, env.OPENROUTER_API_KEY, '')}",
      apiEndpoint: "${first(env.VISION_API_ENDPOINT, 'https://openrouter.ai/api/v1')}",
      model: "${first(env.VISION_API_MODEL, 'nvidia/nemotron-nano-12b-v2-vl:free')}",
      prompt:
        "${first(env.VISION_API_PROMPT, 'Read the meter display in this image and return only the numeric value with decimal point. No units, no text, just the number.')}",
      maxOutputTokens: 1024,
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
    const exif = await exifr.parse(imageBuffer, {
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
 * Uses OpenAI-compatible chat completions format.
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

  const visionRequest = fetch(`${apiEndpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` }
            }
          ]
        }
      ],
      max_tokens: maxOutputTokens,
      temperature
    })
  });

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
  const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";

  // Extract the first number (with optional decimal point) from the response
  const match = raw.match(/[\d]+([.,][\d]+)?/);
  const value = match ? match[0].replace(",", ".") : raw;

  return { value, raw, date };
}
