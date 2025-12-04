import { JournalEntry } from '@/types';

// Client-side wrapper: calls the server API route which holds the real API key
export const isAiAvailable = (): boolean => {
  // The client can't safely determine if the server key is configured; show the UI
  // and handle errors from the server API when invoked.
  return true;
};

export const GeminiService = {
  async generateReflection(entry: JournalEntry): Promise<string> {
    const res = await fetch('/api/generate-reflection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error?.error || 'AI service error');
    }

    const json = await res.json();
    return json.reflection as string;
  },
};
