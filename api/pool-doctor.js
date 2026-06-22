import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function fileToDataUrl(file) {
  const base64 = fs.readFileSync(file.filepath).toString("base64");
  const mime = file.mimetype || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "AI Pool Doctor API is live. Use POST with question/photo.",
      version: "1.1-supervac"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({
    multiples: false,
    maxFileSize: 8 * 1024 * 1024
  });

  form.parse(req, async function (err, fields, files) {
    try {
      if (err) {
        return res.status(400).json({
          error: "Upload failed. Image must be under 8MB."
        });
      }

      const question = Array.isArray(fields.question) ? fields.question[0] : (fields.question || "");
      const name = Array.isArray(fields.name) ? fields.name[0] : (fields.name || "");
      const phone = Array.isArray(fields.phone) ? fields.phone[0] : (fields.phone || "");
      const email = Array.isArray(fields.email) ? fields.email[0] : (fields.email || "");
      const photo = Array.isArray(files.photo) ? files.photo[0] : files.photo;

      const lowerQuestion = String(question).toLowerCase();

      const superVacTrigger =
        lowerQuestion.includes("green") ||
        lowerQuestion.includes("algae") ||
        lowerQuestion.includes("swamp") ||
        lowerQuestion.includes("debris") ||
        lowerQuestion.includes("leaves") ||
        lowerQuestion.includes("leaf") ||
        lowerQuestion.includes("dirt") ||
        lowerQuestion.includes("sludge") ||
        lowerQuestion.includes("silt") ||
        lowerQuestion.includes("bottom") ||
        lowerQuestion.includes("cloudy") ||
        lowerQuestion.includes("opening");

      const serviceInstruction = superVacTrigger
        ? `
IMPORTANT:
The customer's description contains signs of green water, algae, cloudy water, debris, leaves, sludge, silt, poor visibility, or a dirty pool bottom.

You MUST recommend:

Recommended Michiana Pool Dr Service:
SuperVac Pool Recovery — $350 per service

Explain that heavy debris and algae should be physically removed before adding more chemicals because debris consumes chlorine and slows recovery.

Include this exact line near the recommendation:
Book a SuperVac from Michiana Pool Dr — $350 per service.
`
        : `
If the problem involves green water, algae, heavy debris, leaves, dirty pool bottom, sludge, silt, poor visibility, or a spring opening, recommend:
SuperVac Pool Recovery — $350 per service.

If the problem involves pump issues, recommend Equipment Diagnostic.
If the problem involves heater issues, recommend Heater Diagnostic.
If the problem involves salt cell or chlorinator issues, recommend Salt System Inspection.
If the problem involves water loss, recommend Leak Detection.
If the problem involves surface failure or rough finish, recommend ecoFinish Consultation.
If the problem involves automation or app controls, recommend Automation Service.
`;

      const content = [
        {
          type: "input_text",
          text: `
You are AI Pool Doctor for Michiana Pool Dr.

You are an expert swimming pool technician.

Analyze the customer's pool problem from their message and uploaded photo if provided.

Your goal is to:
1. Diagnose the most likely issue.
2. Give practical homeowner-friendly guidance.
3. Recommend the correct Michiana Pool Dr service.
4. Convert serious water-quality problems into booked service opportunities.

${serviceInstruction}

SERVICE RULES:

Strongly recommend SuperVac Pool Recovery — $350 per service when the customer mentions or the image shows:
- Green water
- Dark green water
- Black or swamp-like water
- Heavy algae
- Cloudy green water
- Heavy leaves
- Heavy debris
- Dirt, sludge, or silt on the floor
- Pool floor not visible
- Spring opening with poor water clarity
- Dead algae after shocking
- Debris on the bottom

Explain that SuperVac helps remove:
- Leaves
- Dirt
- Algae waste
- Organic debris
- Heavy sediment

Other recommendations:
- Pump not running, leaking, humming, or low flow: Equipment Diagnostic
- Heater error, ignition issue, gas issue, or heater not firing: Heater Diagnostic
- Salt cell, low salt, flow light, or chlorinator issue: Salt System Inspection
- Losing water or possible leak: Leak Detection
- Surface flaking, staining, rough surface, plaster failure, or finish damage: ecoFinish Consultation
- Automation, app, controller, or screen issue: Automation Service
- Dirty filter, high pressure, low return flow: Filter Cleaning / Equipment Diagnostic

Return a practical, professional answer in this exact format:

🩺 AI Pool Doctor Report

Pool Health Score:
0-100 with one short reason.

Urgency:
Low / Medium / High

Most Likely Issue:
Explain the likely problem.

Confidence:
Low / Medium / High.

What I Notice:
Mention visible issues from the photo if provided. If no photo was uploaded, say so.

Recommended Michiana Pool Dr Service:
Name the single best recommended service. If SuperVac applies, say exactly:
SuperVac Pool Recovery — $350 per service.

Why This Service Makes Sense:
Explain why this service fits the problem.

DIY Success Estimate:
Give a percentage estimate and short explanation.

What To Check:
1.
2.
3.
4.
5.

Recommended Next Steps:
1.
2.
3.
4.

Estimated DIY Cost:
Give a rough range if possible.

Estimated Professional Cost:
Give a rough range. If SuperVac applies, say:
$350 per service.

When To Call Michiana Pool Dr:
Explain when this should become a service call.

Safety Note:
Do not bypass heater, gas, electrical, pressure, or safety controls.

Finish with:
Need professional help?
Michiana Pool Dr
574-208-4688
contact@michianapooldr.com

Customer info:
Name: ${name || "Not provided"}
Phone: ${phone || "Not provided"}
Email: ${email || "Not provided"}

Customer message:
${question || "No written description provided."}
          `
        }
      ];

      if (photo) {
        content.push({
          type: "input_image",
          image_url: fileToDataUrl(photo)
        });
      }

      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content
          }
        ],
        max_output_tokens: 1400
      });

      return res.status(200).json({
        answer: response.output_text,
        recommendedService: superVacTrigger ? "SuperVac Pool Recovery" : "Service Recommendation Based On AI Report",
        recommendedPrice: superVacTrigger ? "$350 per service" : "",
        bookingUrl: "https://www.michianapooldr.com"
      });

    } catch (error) {
      console.error("AI Pool Doctor error:", error);
      return res.status(500).json({
        error: error.message || "AI Pool Doctor failed."
      });
    }
  });
}
