# AI Pool Doctor v1

This project powers a Squarespace AI Pool Doctor widget using Vercel + OpenAI.

## Files

- `api/pool-doctor.js` — secure backend endpoint for Vercel
- `prompts/poolDoctorPrompt.js` — Pool Doctor system instructions
- `squarespace/AI-Pool-Doctor-Code-Block.html` — code to paste into a Squarespace Code Block
- `package.json` — dependencies
- `vercel.json` — Vercel runtime config

## Setup

1. Upload these files to your GitHub repo: `pooldr1/ai-pool-doctor`
2. Import the repo into Vercel.
3. In Vercel, go to Project Settings > Environment Variables.
4. Add:
   `OPENAI_API_KEY`
5. Redeploy the project.
6. Copy your Vercel project URL.
7. In `squarespace/AI-Pool-Doctor-Code-Block.html`, replace:
   `PASTE_YOUR_VERCEL_URL_HERE`
   with your Vercel URL, for example:
   `https://ai-pool-doctor.vercel.app`
8. Paste the updated HTML into your Squarespace Code Block.

## Test

Upload a pool/equipment photo and type a short issue description.

## Notes

- Do not put your OpenAI key in Squarespace.
- Keep your key only in Vercel Environment Variables.
- Max upload size is 8MB.
