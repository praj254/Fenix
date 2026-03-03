const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
async function askGemini(prompt) {
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  // Strip markdown code fences if Gemini adds them
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

const AIService = {

  // ─── Resume vs Job Description Match Score ──────────────────────
  async matchScore(resumeText, jobDescription) {
    const prompt = `
You are an expert ATS (Applicant Tracking System) analyzer.

Compare the following resume and job description. Return a JSON object with:
- score: a number from 0 to 100 representing how well the resume matches the job
- missing_keywords: an array of important keywords from the job description missing in the resume
- suggestions: an array of 3-5 specific improvement suggestions
- summary: a one sentence summary of the match

Resume:
${resumeText}

Job Description:
${jobDescription}

Respond ONLY with a valid JSON object. No markdown, no explanation.
`;
    return await askGemini(prompt);
  },

  // ─── Rejection Email Analyzer ───────────────────────────────────
  async analyzeRejection(emailContent) {
    const prompt = `
You are an expert career coach analyzing a rejection email.

Analyze the following email and return a JSON object with:
- is_rejection: true or false
- sentiment: "positive", "neutral", or "negative"
- reason: the likely reason for rejection (string, or null if unclear)
- skill_gaps: an array of skills or qualities mentioned or implied as lacking
- encouragement: a short motivational note for the applicant
- suggested_improvements: an array of 2-3 actionable improvement tips

Email:
${emailContent}

Respond ONLY with a valid JSON object. No markdown, no explanation.
`;
    return await askGemini(prompt);
  },

  // ─── ATS Probability Checker ────────────────────────────────────
  async atsCheck(resumeText, jobDescription) {
    const prompt = `
You are an ATS (Applicant Tracking System) expert.

Analyze how well this resume would perform in an ATS scan for the given job description.
Return a JSON object with:
- ats_score: number from 0 to 100
- matched_keywords: array of keywords found in both resume and job description
- missing_keywords: array of important keywords missing from the resume
- format_issues: array of any resume formatting issues that could hurt ATS parsing
- recommendations: array of 3-5 specific changes to improve ATS score

Resume:
${resumeText}

Job Description:
${jobDescription}

Respond ONLY with a valid JSON object. No markdown, no explanation.
`;
    return await askGemini(prompt);
  }

};

module.exports = AIService;