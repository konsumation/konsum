/**
 * Meter photo OCR via external AI vision API.
 * All connection details are taken from config — nothing is hardcoded.
 */

export const defaultMeterPhotoConfig = {
  meterPhoto: {
    enabled: false,
    gemini: {
      apiKey: "${first(env.GEMINI_API_KEY,'')}",
      apiEndpoint:
        "${first(env.GEMINI_ENDPOINT,'https://generativelanguage.googleapis.com/v1beta')}",
      model: "${first(env.GEMINI_MODEL,'gemini-2.0-flash')}",
      prompt:
        "${first(env.GEMINI_PROMPT,'Read the meter display in this image and return only the numeric value with decimal point. No units, no text, just the number.')}",
      maxOutputTokens: 64,
      temperature: 0
    }
  }
};

/**
 * Send an image to the configured AI vision API and return the recognized meter value.
 *
 * @param {object} config - the meterPhoto config section
 * @param {string} imageBase64 - base64-encoded image data
 * @param {string} mimeType - MIME type of the image (e.g. "image/jpeg")
 * @returns {Promise<{value: string, raw: string}>}
 */
export async function recognizeMeterValue(config, imageBase64, mimeType) {
  const { apiKey, apiEndpoint, model, prompt, maxOutputTokens, temperature } =
    config.gemini;

  const url = `${apiEndpoint}/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: imageBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      maxOutputTokens,
      temperature
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  // Extract the first number (with optional decimal point) from the response
  const match = raw.match(/[\d]+([.,][\d]+)?/);
  const value = match ? match[0].replace(",", ".") : raw;

  return { value, raw };
}
