const { GoogleGenAI, Type } = require('@google/genai');
const axios  = require('axios');
const logger = require('../utils/logger');

// The user placed their Gemini API Key in the OPENAI_API_KEY environment variable.
const apiKey = process.env.OPENAI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

const JOB_SEARCH_URL  = process.env.JOB_SEARCH_URL  || 'http://localhost:3002';
const JOB_POSTING_URL = process.env.JOB_POSTING_URL || 'http://localhost:3001';

// ── Tool Definitions for Gemini Function Calling ─────────────────────────────
const searchJobsTool = {
  name: 'search_jobs',
  description: 'Search for job listings based on title/position and location filters.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title:        { type: Type.STRING, description: 'Job title or position keyword' },
      city:         { type: Type.STRING, description: 'City name' },
      country:      { type: Type.STRING, description: 'Country name' },
      working_type: { type: Type.STRING, description: 'fulltime | parttime | remote | hybrid | contract' },
      limit:        { type: Type.INTEGER, description: 'Max results (default 15)' },
    },
  },
};

const getJobDetailTool = {
  name: 'get_job_detail',
  description: 'Get full details for a specific job by its ID.',
  parameters: {
    type: Type.OBJECT,
    required: ['job_id'],
    properties: {
      job_id: { type: Type.STRING, description: 'UUID of the job posting' },
    },
  },
};

const tools = [{ functionDeclarations: [searchJobsTool, getJobDetailTool] }];

// ── Tool Execution ────────────────────────────────────────────────────────────
async function executeTool(name, args) {
  if (name === 'search_jobs') {
    const params = new URLSearchParams({
      title:        args.title        || '',
      city:         args.city         || '',
      country:      args.country      || '',
      working_type: args.working_type || '',
      limit:        args.limit        || 15,
    });
    try {
      const { data } = await axios.get(`${JOB_SEARCH_URL}/api/v1/search?${params}`);
      return data.data || [];
    } catch (e) {
      return { error: 'Failed to search jobs' };
    }
  }

  if (name === 'get_job_detail') {
    try {
      const { data } = await axios.get(`${JOB_POSTING_URL}/api/v1/jobs/${args.job_id}`);
      return data.data || {};
    } catch (e) {
      return { error: 'Job not found' };
    }
  }

  return { error: 'Unknown tool' };
}

// ── Main Chat Handler ─────────────────────────────────────────────────────────
async function chat(req, res) {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'message is required.' });

  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: 'AI service not configured. Please set OPENAI_API_KEY.',
    });
  }

  const systemInstruction = `You are BeWorkReady AI — an expert, warm, and highly professional Career Assistant built into the BeWorkReady job search platform.

## YOUR ROLE
You help users discover job opportunities, understand job details, and accelerate their careers. You have direct access to a live job database via tools.

## LANGUAGE
ALWAYS respond in fluent, professional English. If the user writes in Turkish or any other language, understand it but reply fully in English.

## FORMATTING — CRITICAL RULES
- NEVER use raw asterisk bullet points like "* item". They render as literal asterisks. Use numbered lists or plain prose instead.
- Use **bold** for job titles, company names, and key labels.
- Use headers (##, ###) to organize longer responses.
- For job listings, format EVERY result exactly like this:

---
**1. [Job Title]**
🏢 Company: [Company Name]
📍 Location: [City], [Country]
💼 Type: [Work Type]
💰 Salary: [Min]–[Max] [Currency] (or "Not specified")
📝 About: [1–2 sentence summary from the description]
---

- After listing all jobs, add a short, helpful closing remark (tips, offer to narrow down, etc.).

## WHEN SEARCHING JOBS
- Always call search_jobs with the parameters the user gives (title, city, country, working_type).
- Show EVERY single result returned — never truncate or omit any listing.
- If the city is mentioned (e.g. "Izmir", "Istanbul"), pass it in the city parameter.
- If results are empty: do NOT just list suggestions as bullet points. Write a clear sentence explaining what was searched, then IMMEDIATELY call search_jobs again with a broader query (e.g. remove city or use a more general title). Show whatever comes back.
- If still no results after retrying, tell the user clearly and suggest visiting the Explore page.

## WHEN SHOWING JOB DETAILS
- Call get_job_detail with the job ID.
- Present ALL fields: title, company, city, country, work type, full salary range, full description.
- Offer to help the user apply or discover similar roles.

## CAREER ADVICE
- CV/Resume: give concrete numbered steps, not bullet points.
- Interview prep: give specific sample questions with model answers.
- Salary questions: give realistic market-based ranges for the role.
- Always be encouraging, constructive, and specific.

## TONE
Professional, warm, and motivating. Write like a knowledgeable career mentor who genuinely cares about the user's success.`;


  // Map history format: from frontend { role: 'user' | 'assistant', content: string }
  const contents = history.slice(-10).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    let response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        tools
      }
    });

    let assistantMessage = response.candidates[0].content;

    // ── Agentic loop: execute tool calls ─────────────────────────────────────
    while (assistantMessage.parts.some(p => p.functionCall)) {
      contents.push(assistantMessage);

      const functionResponses = await Promise.all(
        assistantMessage.parts.filter(p => p.functionCall).map(async part => {
          const call = part.functionCall;
          logger.info(`[AI] Tool: ${call.name} | Args: ${JSON.stringify(call.args)}`);
          const result = await executeTool(call.name, call.args);
          return {
            functionResponse: {
              name: call.name,
              response: { result }
            }
          };
        })
      );

      contents.push({ role: 'user', parts: functionResponses });

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          tools
        }
      });

      assistantMessage = response.candidates[0].content;
    }

    const finalReply = assistantMessage.parts.map(p => p.text).join(' ');

    res.json({
      success: true,
      reply: finalReply
    });
  } catch (err) {
    logger.error(`[AI] Chat error: ${err.message}`);
    res.status(500).json({ success: false, message: 'AI processing failed.' });
  }
}

module.exports = { chat };
