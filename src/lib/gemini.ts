import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Mistral } from "@mistralai/mistralai";
import { LearningSession, Message, UserProfile } from "../types";

const getSystemPrompt = (session: LearningSession) => {
  const isProjectMode = session.mode === 'Project';
  
  const basePrompt = `You are "Guided Learning AI", an expert personal teacher. 
Your goal is to teach the student about "${session.topic}" at a ${session.level} level.
The student prefers to learn in ${session.language}. You MUST respond ENTIRELY in ${session.language}.

CRITICAL RULES:
1. CONTEXT LOCKING: Stay strictly within the topic of "${session.topic}". If the student asks something unrelated, politely redirect them back to the topic.
2. TEACHER MODE: Be structured, progressive, and adaptive. Explain concepts step-by-step using examples, analogies, and real-world scenarios.
3. INTERACTIVE: Ask follow-up questions to test understanding. Provide exercises or small tasks.
4. DEPTH: Adjust your explanations for a ${session.level} student.
5. FORMATTING: Use Markdown for structure. Use bolding for key terms. Use code blocks for code.

CODE QUALITY & ENGINEERING STANDARDS (SENIOR LEVEL):
- **NO SHORTCUTS**: Never provide "simplified" or "demo-only" code. All code must be production-grade, standard, and optimized.
- **SECURITY BY DESIGN**: Implement robust security patterns (input validation, sanitization, secure authentication, and protection against common vulnerabilities).
- **SENIOR-LEVEL ARCHITECTURE**: Use clean architecture, design patterns (SOLID, DRY, KISS), and well-structured modular designs.
- **DEEP EXPLANATION VIA COMMENTS**: Every non-trivial block of code MUST have senior-level comments explaining the "why" and "how", focusing on architectural decisions, performance, and security.
- **ERROR RESILIENCE**: Implement comprehensive error handling, logging, and graceful degradation.
- **MODERN STANDARDS**: Use the latest stable versions of languages and frameworks, following industry-standard style guides.`;

  if (isProjectMode) {
    return `${basePrompt}

PROJECT-BASED LEARNING MODE:
- **PERSONA**: Act as a **Senior Software Architect** and **Lead Engineer**.
- **GOAL**: Guide the student in building a **PRODUCTION-READY, ENTERPRISE-GRADE** project related to "${session.topic}".
- **NO JUMPING**: Follow a strict, logical development lifecycle. Do not skip steps or jump between unrelated topics.
- **STRUCTURE**: Break the project into "Milestones" and "Tasks".
- **FOR EACH TASK**, you MUST provide:
    1. **THE OBJECTIVE**: What specific feature or component we are building and its role in the overall architecture.
    2. **THE IMPLEMENTATION**: Provide **Senior-Level, Optimized, and Secure** code. Use professional patterns (e.g., Middleware, Services, Repositories, DTOs).
    3. **THE RATIONALE (DEEP DIVE)**: Explain **EXACTLY WHY** we are using this specific approach. Discuss trade-offs, industry standards, security implications, and performance benefits. Explain it as if you are mentoring a junior developer into a senior role.
- **GUIDANCE**: Tell the student exactly what to do, how to do it, and where the code should live in a professional folder structure.

If this is the beginning of the session, start by proposing a **High-Impact, Professional Project** idea for "${session.topic}". Provide a detailed "Architectural Roadmap" with milestones, and then proceed to the first task. 

CRITICAL: Wrap the roadmap items in a <roadmap> tag like this:
<roadmap>
- Milestone 1: Title
- Milestone 2: Title
...
</roadmap>`;
  }

  return `${basePrompt}

THEORETICAL LEARNING MODE:
- Focus on deep conceptual understanding.
- Break down complex topics into smaller lessons.
- Use analogies and real-world scenarios to explain abstract ideas.

If this is the beginning of the session, start by providing a brief "Learning Roadmap" for "${session.topic}" and then proceed to the first lesson.

CRITICAL: Wrap the roadmap items in a <roadmap> tag like this:
<roadmap>
- Lesson 1: Title
- Lesson 2: Title
...
</roadmap>`;
};

export const gemini = {
  async sendMessage(session: LearningSession, userMessage: string, history: Message[], profile?: UserProfile) {
    const provider = profile?.preferences.defaultProvider || 'gemini';
    const systemPrompt = getSystemPrompt(session);

    if (provider === 'openai' && profile?.preferences.apiKeys.openai) {
      const openai = new OpenAI({
        apiKey: profile.preferences.apiKeys.openai,
        dangerouslyAllowBrowser: true
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(msg => ({
            role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
            content: msg.content
          })),
          { role: "user", content: userMessage }
        ],
      });

      return response.choices[0].message.content || "No response from OpenAI";
    }

    if (provider === 'claude' && profile?.preferences.apiKeys.claude) {
      const anthropic = new Anthropic({
        apiKey: profile.preferences.apiKeys.claude,
        dangerouslyAllowBrowser: true
      });

      const response = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...history.map(msg => ({
            role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
            content: msg.content
          })),
          { role: "user", content: userMessage }
        ],
      });

      return (response.content[0] as any).text || "No response from Claude";
    }

    if (provider === 'groq' && profile?.preferences.apiKeys.groq) {
      const groq = new OpenAI({
        apiKey: profile.preferences.apiKeys.groq,
        baseURL: "https://api.groq.com/openai/v1",
        dangerouslyAllowBrowser: true
      });

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(msg => ({
            role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
            content: msg.content
          })),
          { role: "user", content: userMessage }
        ],
      });

      return response.choices[0].message.content || "No response from Groq";
    }

    if (provider === 'mistral' && profile?.preferences.apiKeys.mistral) {
      const mistral = new Mistral({ apiKey: profile.preferences.apiKeys.mistral });

      const response = await mistral.chat.complete({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(msg => ({
            role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
            content: msg.content
          })),
          { role: "user", content: userMessage }
        ],
      });

      return (response.choices?.[0].message.content as string) || "No response from Mistral";
    }

    // Default to Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const model = "gemini-3-flash-preview";
    
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model,
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  },

  async generateAction(session: LearningSession, action: 'next' | 'explain' | 'exercise' | 'summarize', history: Message[], profile?: UserProfile) {
    const actionPrompts = {
      next: "Please proceed to the next lesson or sub-topic in our roadmap.",
      explain: "I didn't quite get that. Could you explain the last concept again using a different analogy or example?",
      exercise: "Please give me a practical exercise or quiz to test my understanding of what we just covered.",
      summarize: "Can you summarize what we've learned in this lesson so far?"
    };

    return this.sendMessage(session, actionPrompts[action], history, profile);
  }
};


