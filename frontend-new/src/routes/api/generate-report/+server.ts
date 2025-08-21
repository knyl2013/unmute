import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { json, error as svelteKitError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ChatMessage } from '$lib/types';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { conversation } = (await request.json()) as { conversation: ChatMessage[] };

    if (!conversation || conversation.length === 0) {
      throw svelteKitError(400, 'Conversation data is required.');
    }

    const userTranscript = conversation.map(msg => (msg.role) + ": " + msg.content).join('\n');

    // The core of the feature: The Prompt
    const systemPrompt = `
      You are an expert IELTS examiner. Your task is to evaluate a user's conversation transcript based on the four official IELTS speaking criteria. Provide a score from 1-9 for each criterion and an overall band score.

      The criteria are:
      1.  **Fluency and coherence (FC)**: Assess the user's ability to speak at length, the flow of their speech, and the logical connection between their ideas.
      2.  **Lexical Resource (LR)**: Evaluate the range and accuracy of the vocabulary used. Look for idiomatic language and less common words.
      3.  **Grammatical Range and Accuracy (GRA)**: Judge the variety and correctness of grammatical structures.
      4.  **Pronunciation (P)**: Based on the text, you cannot assess actual pronunciation. Instead, evaluate this based on textual cues that might suggest naturalness, such as the use of contractions and conversational phrasing. Acknowledge this limitation in your feedback for this criterion.

      Analyze the following transcript of the user's speech:
      ---
      ${userTranscript}
      ---
      
      Your response MUST be a valid JSON object. Do not include any text or markdown formatting before or after the JSON object. The JSON object should follow this exact structure:
      {
        "overallScore": <number>,
        "feedback": "<string: Overall feedback on the performance>",
        "scores": {
          "fluencyAndCoherence": { "score": <number>, "feedback": "<string: Detailed feedback for FC>" },
          "lexicalResource": { "score": <number>, "feedback": "<string: Detailed feedback for LR>" },
          "grammaticalRangeAndAccuracy": { "score": <number>, "feedback": "<string: Detailed feedback for GRA>" },
          "pronunciation": { "score": <number>, "feedback": "<string: Detailed feedback for P, acknowledging text limitations>" }
        },
        "suggestionsForImprovement": [
          "<string: Actionable suggestion 1>",
          "<string: Actionable suggestion 2>"
        ],
        "specificSuggestions": [
          {
            "original": "<string: The user's exact phrase from the transcript that needs improvement. Example: 'I went to school using bus.'>",
            "suggestion": "<string: The corrected or improved version of the phrase. Example: 'I went to school by bus.'>",
            "explanation": "<string: A brief, clear reason for the change. Example: 'Use the preposition \\'by\\' when referring to a mode of transport.'>"
          }
          ... // Include more suggestions (at most 5) if needed
        ],
        "conversationSummary": "<string: Summary for the conversation, (and some user performance if applicable) in a way that an LLM would unserstand for context"
      }
    `;

    const completion = await openai.chat.completions.create({
      model: 'o3-mini', // Or 'gpt-3.5-turbo' for faster, cheaper results
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' }, // Use JSON mode for reliable output
    });

    const reportJson = completion.choices[0].message.content;

    if (!reportJson) {
      throw new Error('OpenAI returned an empty response.');
    }
    
    // Parse the JSON string from the AI to ensure it's valid before sending
    const reportData = JSON.parse(reportJson);

    reportData.date = new Date();

    return json(reportData);

  } catch (err: any) {
    console.error('API Error:', err);
    throw svelteKitError(500, err.message || 'An internal server error occurred.');
  }
};