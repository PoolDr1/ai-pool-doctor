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
      status: "AI Pool Doctor API is live. Use POST with question/photo."
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
        return res.status(400).json({ error: "Upload failed. Image must be under 8MB." });
      }

      const question = Array.isArray(fields.question) ? fields.question[0] : (fields.question || "");
      const name = Array.isArray(fields.name) ? fields.name[0] : (fields.name || "");
      const phone = Array.isArray(fields.phone) ? fields.phone[0] : (fields.phone || "");
      const email = Array.isArray(fields.email) ? fields.email[0] : (fields.email || "");
      const photo = Array.isArray(files.photo) ? files.photo[0] : files.photo;

      const content = [
        {
          type: "input_text",
          text: `
You are AI Pool Doctor for Michiana Pool Dr.

Analyze the customer's pool problem from their message and uploaded photo if provided.

Return a practical, professional answer in this format:

🩺 AI Pool Doctor Report

Pool Health Score:
0-100 with one short reason.

Most Likely Issue:
Explain the likely problem.

Confidence:
Low / Medium / High.

What I Notice:
Mention visible issues from the photo if provided.

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

Estimated Professional Range:
Give a rough range or say inspection needed.

When To Call Michiana Pool Dr:
Explain when this should become a service call.

Safety Note:
Do not bypass heater, gas, electrical, pressure, or safety controls.

Contact:
Michiana Pool Dr
contact@michianapooldr.com
574-208-4688

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
        max_output_tokens: 1200
      });

      return res.status(200).json({
        answer: response.output_text
      });

    } catch (error) {
      console.error("AI Pool Doctor error:", error);
      return res.status(500).json({
        error: error.message || "AI Pool Doctor failed."
      });
    }
  });
}
