import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";
import { POOL_DOCTOR_PROMPT } from "../prompts/poolDoctorPrompt.js";

export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ALLOWED_ORIGINS = [
  "https://www.michianapooldr.com",
  "https://michianapooldr.com"
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://www.michianapooldr.com");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readFileAsDataUrl(file) {
  const base64 = fs.readFileSync(file.filepath).toString("base64");
  const mimetype = file.mimetype || "image/jpeg";
  return `data:${mimetype};base64,${base64}`;
}

function getField(fields, key) {
  const value = fields[key];
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY environment variable" });
  }

  const form = formidable({
    multiples: false,
    maxFileSize: 8 * 1024 * 1024,
    filter: function ({ mimetype }) {
      return Boolean(mimetype && mimetype.includes("image"));
    }
  });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        return res.status(400).json({ error: "Upload failed. Image must be under 8MB." });
      }

      const question = getField(fields, "question").trim();
      const name = getField(fields, "name").trim();
      const phone = getField(fields, "phone").trim();
      const email = getField(fields, "email").trim();
      const photo = Array.isArray(files.photo) ? files.photo[0] : files.photo;

      if (!question && !photo) {
        return res.status(400).json({ error: "Please enter a question or upload a photo." });
      }

      const content = [
        {
          type: "input_text",
          text: `${POOL_DOCTOR_PROMPT}

Customer info:
Name: ${name || "Not provided"}
Phone: ${phone || "Not provided"}
Email: ${email || "Not provided"}

Customer message:
${question || "No written description provided."}`
        }
      ];

      if (photo) {
        content.push({
          type: "input_image",
          image_url: readFileAsDataUrl(photo)
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
        max_output_tokens: 1300
      });

      return res.status(200).json({
        answer: response.output_text || "AI Pool Doctor could not generate a response."
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "AI Pool Doctor failed. Please try again or contact Michiana Pool Dr."
      });
    }
  });
}
