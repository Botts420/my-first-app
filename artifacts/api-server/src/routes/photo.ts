import { Router, type IRouter } from "express";
import { TransformPhotoBody } from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { Modality } from "@google/genai";

const router: IRouter = Router();

router.post("/photo/transform", async (req, res) => {
  const parsed = TransformPhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    return;
  }

  const { imageBase64, mimeType, direction } = parsed.data;

  const prompt =
    direction === "dayToNight"
      ? "Transform this photo into the same scene at night. Keep the exact composition, framing, perspective, subjects, and objects identical. Replace daytime lighting with realistic nighttime lighting: a dark sky (moon, stars, or city glow as appropriate), warm artificial lights from windows, lampposts, and signage, deep shadows, cool moonlit highlights, and accurate reflections. The result should look like a photograph taken at night of the exact same scene."
      : "Transform this photo into the same scene during daytime. Keep the exact composition, framing, perspective, subjects, and objects identical. Replace nighttime lighting with realistic daytime lighting: a bright sky (clear blue or naturally clouded), strong directional sunlight, soft natural shadows, vivid daylight colors, and accurate reflections. Turn off artificial lights. The result should look like a photograph taken in daylight of the exact same scene.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      req.log.error({ response }, "No image returned from Gemini");
      res.status(502).json({ error: "Model did not return an image" });
      return;
    }

    res.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? "image/png",
    });
  } catch (err) {
    req.log.error({ err }, "Photo transformation failed");
    res.status(500).json({ error: "Photo transformation failed" });
  }
});

export default router;
