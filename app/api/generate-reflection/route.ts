import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

type Entry = {
  title?: string;
  content: string;
  mood?: string;
};

export async function POST(req: Request) {
  try {
    const body: Entry = await req.json();

    if (!body?.content) {
      return NextResponse.json(
        { error: 'Missing entry content' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Act as a supportive, mindful therapist and life coach.
      Read the following journal entry and provide a brief, warm, and insightful reflection (max 100 words).
      Validate the user's feelings (Mood: ${
        body.mood || 'unknown'
      }) and offer a gentle perspective or a question for self-discovery.

      Journal Title: ${body.title || 'Untitled'}
      Content: ${body.content}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });

    const text =
      response?.text || "I couldn't generate a reflection at this moment.";
    return NextResponse.json({ reflection: text });
  } catch (err) {
    // Keep server errors opaque to clients but log for debugging
    // eslint-disable-next-line no-console
    console.error('generate-reflection error', err);
    // If a DEBUG_SECRET is set in the server env, allow returning error details
    // only when the caller supplies the matching header. This helps debug
    // production issues without leaking sensitive info to the public.
    const debugSecret = process.env.DEBUG_SECRET;
    const provided = (req.headers.get('x-debug-secret') || '') as string;
    if (debugSecret && provided && provided === debugSecret) {
      const details =
        err instanceof Error ? err.stack || err.message : String(err);
      return NextResponse.json(
        { error: 'Failed to generate reflection', details },
        { status: 500 }
      );
    }

    // In non-production environments we already return details earlier.
    if (process.env.NODE_ENV !== 'production') {
      const details = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: 'Failed to generate reflection', details },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate reflection' },
      { status: 500 }
    );
  }
}
