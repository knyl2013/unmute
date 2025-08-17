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

export interface SpecificSuggestion {
  original: string;
  suggestion: string;
  explanation: string;
}

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
  specificSuggestions?: SpecificSuggestion[];
  conversationSummary: string;
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

export const generateReport = async (chatHistory: ChatMessage[], isReportReady: boolean) => {
  reportStore.set({ status: 'generating', data: null, error: null });

  try {
    if (!isReportReady) {
      throw new Error("Not enough conversation data to generate a report. Please try again and chat for a bit longer.");
    }

    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation: chatHistory }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate report.');
    }

    const reportData: ReportData = await response.json();
    
    const reportHistory = JSON.parse(localStorage.getItem('reportHistory') || '[]') || [];
    const newReportHistory = [...reportHistory, reportData];
    localStorage.setItem('reportHistory', JSON.stringify(newReportHistory));

    // 4. On success, update the store. The /report/latest page will reactively
    // update from 'generating' to show the full report.
    reportStore.set({ status: 'success', data: reportData, error: null });

  } catch (err: any) {
    // 5. On failure, update the store. The /report/latest page will show the error.
    console.error("Report generation failed:", err);
    reportStore.set({ status: 'error', data: null, error: err.message });
  }
};