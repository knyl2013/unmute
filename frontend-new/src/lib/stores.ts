// src/lib/stores.ts
import { readable, writable } from 'svelte/store';
import type { ChatMessage } from './chatHistory';

/**
 * A readable Svelte store that updates with the current Date every second.
 * It automatically handles starting and stopping the interval, so it's
 * highly efficient and won't run when no components are listening to it.
 */
export const now = readable(new Date(), (set) => {
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);

  // This cleanup function is called by Svelte when the last subscriber unsubscribes
  return () => {
    clearInterval(interval);
  };
});

export interface ReportData {
  date: Date;
  overallScore: number;
  feedback: string;
  scores: {
    fluencyAndCoherence: { score: number; feedback: string };
    lexicalResource: { score: number; feedback: string };
    grammaticalRangeAndAccuracy: { score: number; feedback: string };
    pronunciation: { score: number; feedback: string };
  };
  suggestionsForImprovement: string[];
}

interface ReportState {
  status: 'idle' | 'generating' | 'success' | 'error';
  data: ReportData | null;
  error: string | null;
}

// Create the writable store with an initial state
export const reportStore = writable<ReportState>({
  status: 'idle',
  data: null,
  error: null,
});

// Helper function to trigger report generation
export const generateReport = async (chatHistory: ChatMessage[]) => {
  // 1. Set status to 'generating'
  reportStore.set({ status: 'generating', data: null, error: null });

  try {
    // 2. Filter for user messages only, as that's what we want to evaluate
    const userMessages = chatHistory.filter(msg => msg.role === 'user');
    if (userMessages.length < 10) {
      throw new Error("Not enough user data to generate a report. Please try again and chat at least for a minute");
    }
    
    // 3. Call our internal SvelteKit API endpoint
    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation: userMessages }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate report.');
    }

    const reportData: ReportData = await response.json();

    const reportHistory = JSON.parse(localStorage['reportHistory'] || '[]') || [];

    const newReportHistory = [...reportHistory, reportData];

    localStorage['reportHistory'] = JSON.stringify(newReportHistory); 
    
    // 4. On success, update the store
    reportStore.set({ status: 'success', data: reportData, error: null });

  } catch (err: any) {
    // 5. On failure, update the store
    console.error("Report generation failed:", err);
    reportStore.set({ status: 'error', data: null, error: err.message });
  }
};