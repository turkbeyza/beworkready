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

  const systemInstruction = `You are a professional, helpful, and highly intelligent job search assistant for "Be Work Ready" - a Turkish job platform.
You MUST help users find jobs by calling the search_jobs and get_job_detail tools.
Always respond in the same language the user writes in (Turkish or English).

IMPORTANT FORMATTING RULES:
1. ALWAYS use rich Markdown to format your response.
2. List EACH job you find. Do NOT skip any jobs returned by the tool. If there are 10 jobs, list all 10.
3. Use bold text for Job Titles and Company Names.
4. Format the output with bullet points or numbered lists.
5. If the user asks for a city with Turkish characters (e.g. Izmir vs İzmir), try to handle it.
6. Provide brief, polite, and encouraging text before and after the job list.`;

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
