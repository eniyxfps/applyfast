const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// AI Analyze route
app.post("/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: "Missing resumeText or jobDescription"
      });
    }

    const prompt = `You are an expert career coach. Given a job description and resume, respond ONLY with a valid JSON object — no markdown fences, no preamble, no extra text.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

Respond with JSON matching exactly this schema:
{
  "fit_score": integer 0-100,
  "grade": "Excellent Match" | "Strong Match" | "Good Match" | "Partial Match" | "Weak Match",
  "verdict": "one concise sentence about overall fit, max 18 words",
  "skills_score": integer 0-100,
  "experience_score": integer 0-100,
  "keywords_score": integer 0-100,
  "matched_keywords": ["up to 5 keywords from the JD that appear in the resume"],
  "missing_keywords": ["up to 4 important keywords from the JD missing from the resume"],
  "resume": "full rewritten resume as plain text, optimized for this role",
  "cover_letter": "professional cover letter as plain text, 3-4 paragraphs",
  "interview_questions": [
    {"category": "Behavioral" | "Technical" | "Role-specific" | "Culture fit", "question": "string"}
  ]
}
The interview_questions array must contain exactly 8 items.`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiResult = response.data.choices[0].message.content;

    // Strip markdown fences if the model added them, then parse
    const cleaned = aiResult.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI response as JSON:", cleaned);
      return res.status(502).json({
        error: "AI returned invalid JSON",
        raw: cleaned
      });
    }

    return res.json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: "AI request failed",
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});