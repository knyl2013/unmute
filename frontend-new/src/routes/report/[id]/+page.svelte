<script lang="ts">
  import { reportStore, type ReportData } from '$lib/stores';
  import { page } from '$app/stores'; // Import page store to get URL params
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // Define types for clarity
  type ReportState = {
    status: 'generating' | 'success' | 'error' | 'idle';
    data?: ReportData;
    error?: string;
  };
  
  let currentReportState: ReportState;
  
  // Get the report ID (date) from the URL
  const reportId = $page.params.id;

  const goBack = () => {
    // The history API is available in all modern browsers.
    // We check the length to see if there is a previous page in the session history.
    if (window.history.length > 1) {
      // If there is, go back to it (e.g., /history or /)
      window.history.back();
    } else {
      // Otherwise, as a fallback, go to the home page. This handles cases
      // where the user refreshed the page or opened it from a direct link.
      goto('/');
    }
  };

  onMount(() => {
    // If the ID is 'latest', it means we are showing a newly generated report.
    // We get this from the store.
    if (reportId === 'latest') {
      const unsubscribe = reportStore.subscribe(value => {
        currentReportState = {
            status: value.status,
            data: value.data ?? undefined,
            error: value.error ?? undefined
        }
      });
      return unsubscribe;
    } else {
      // Otherwise, we are viewing a report from history. Load it from localStorage.
      try {
        const rawHistory = localStorage.getItem('reportHistory');
        if (rawHistory) {
          const history: ReportData[] = JSON.parse(rawHistory);
          const foundReport = history.find(report => report.date.toString() === decodeURIComponent(reportId || ""));
          
          if (foundReport) {
            currentReportState = { status: 'success', data: foundReport };
          } else {
            currentReportState = { status: 'error', error: 'Report not found in your history.' };
          }
        } else {
          currentReportState = { status: 'error', error: 'No report history found.' };
        }
      } catch (e) {
        currentReportState = { status: 'error', error: 'Failed to load report from history.' };
      }
    }
  });

  const formatCriterionName = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  };
</script>

<div class="reportContainer">
  {#if (!currentReportState || currentReportState.status === 'generating')}
    <div class="statusContainer">
      <div class="spinner"></div>
      <h1 class="statusTitle">Generating Report</h1>
      <p class="statusSubtitle">Analyzing your conversation, please wait...</p>
    </div>
  {:else if currentReportState.status === 'error'}
    <div class="statusContainer">
      <h1 class="statusTitle error">Report Failed</h1>
      <p class="statusSubtitle">{currentReportState.error || 'An unknown error occurred.'}</p>
      <div class="footerControls">
        <a href="/" class="actionButton start">Try Again</a>
      </div>
    </div>
  {:else if currentReportState.status === 'success' && currentReportState.data}
    {@const report = currentReportState.data}
    <header class="header">
      <button class="backButton" on:click={goBack} aria-label="Back">
        <!-- ... Back SVG ... -->
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="white"/>
        </svg>
      </button>
      <div class="callerInfo">
        <h1>Your IELTS Report</h1>
        <p>A detailed breakdown of your performance</p>
      </div>
      <button class="historyButton" on:click={() => goto('/history')} aria-label="View History">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.28 15.54L17 14.33L13.5 12.25V8H12Z" fill="white"/>
        </svg>
      </button>
    </header>
  
   <main class="mainContent">
      <!-- Overall Score Section -->
      <section class="overallScoreSection">
        <div class="scoreCircle">
          {report.overallScore.toFixed(1)}
        </div>
        <p class="overallFeedback">{report.feedback}</p>
      </section>

      <!-- Detailed Scores Section -->
      <section>
        <h2 class="sectionTitle">Detailed Breakdown</h2>
        <div class="detailedScores">
          {#each Object.entries(report.scores) as [key, value]}
            <div class="scoreCard">
              <div class="scoreCardHeader">
                <h3 class="criterionName">{formatCriterionName(key)}</h3>
                <span class="criterionScore">{value.score.toFixed(1)}</span>
              </div>
              <p class="criterionFeedback">{value.feedback}</p>
            </div>
          {/each}
        </div>
      </section>

      <!-- Suggestions Section -->
      <section class="suggestionsSection">
        <h2 class="sectionTitle">Actionable Suggestions</h2>
        <ul class="suggestionsList">
          {#each report.suggestionsForImprovement as suggestion}
            <li class="suggestionItem">
              <span class="checkmark">✓</span>
              {suggestion}
            </li>
          {/each}
        </ul>
      </section>
    </main>
  {/if}
</div>

<style>
 .reportContainer {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: radial-gradient(circle at 50% 50%, #5a4743, #3a2723);
  }

  /* Header (copied and adapted) */
  .header {
    padding: 50px 20px 20px;
    text-align: center;
    position: relative;
    flex-shrink: 0; /* Prevents header from shrinking */
  }

  .backButton {
    position: absolute;
    left: 15px;
    top: 55px;
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 5px;
  }
  
  .callerInfo h1 {
    margin: 0;
    font-size: 2.2rem;
    font-weight: 600;
  }

  .callerInfo p {
    margin: 5px 0 0;
    font-size: 1rem;
    color: #d1d1d6;
    font-weight: 400;
  }

  /* Main Content Area */
  .mainContent {
    flex-grow: 1;
    overflow-y: auto; /* Crucial for long reports */
    padding: 10px 30px 30px 30px;
  }
  /* Hide scrollbar for a cleaner look */
  .mainContent::-webkit-scrollbar {
    display: none;
  }
  .mainContent {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Overall Score Styling */
  .overallScoreSection {
    text-align: center;
    margin-bottom: 30px;
  }

  .scoreCircle {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 10px auto 20px;
    font-size: 3.5rem;
    font-weight: 700;
    background: rgba(0,0,0,0.15);
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
  }

  .overallFeedback {
    font-size: 1rem;
    color: #e0e0e0;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.5;
  }

  /* Shared Section Title */
  .sectionTitle {
    font-size: 1.4rem;
    font-weight: 600;
    margin-top: 20px;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  }

  /* Detailed Scores Grid */
  .detailedScores {
    display: grid;
    grid-template-columns: 1fr; /* Default to single column */
    gap: 15px;
  }
  /* On wider screens, go to 2 columns */
  @media (min-width: 768px) {
    .detailedScores {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  .scoreCard {
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.2s ease, background-color 0.2s ease;
  }
  .scoreCard:hover {
    transform: translateY(-3px);
    background: rgba(255, 255, 255, 0.08);
  }

  .scoreCardHeader {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }

  .criterionName {
    font-size: 1.1rem;
    font-weight: 500;
    color: #ffffff;
  }

  .criterionScore {
    font-size: 1.8rem;
    font-weight: bold;
    color: #ffffff;
  }

  .criterionFeedback {
    font-size: 0.95rem;
    color: #c7c7cc;
    line-height: 1.6;
  }

  /* Suggestions List */
  .suggestionsSection {
    padding-bottom: 40px; /* Extra padding at the very end */
  }

  .suggestionsList {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .suggestionItem {
    background: rgba(46, 204, 113, 0.1);
    border-left: 3px solid #34c759;
    padding: 15px;
    border-radius: 8px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 0.95rem;
    color: #e0e0e0;
  }
  .checkmark {
    color: #34c759;
    font-weight: bold;
    font-size: 1.1rem;
    line-height: 1.5;
  }

  /* Footer Controls */
  .footerControls {
    padding: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .actionButton {
    display: inline-block;
    padding: 15px 40px;
    border-radius: 30px;
    border: none;
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
  }
  .actionButton:active {
    transform: scale(0.98);
  }
  .actionButton.start {
    background-color: #34c759;
  }
  .actionButton.start:hover {
    background-color: #45d160;
  }

  /* Loading and Error States */
  .statusContainer {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px;
    text-align: center;
  }
  .statusTitle {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .statusTitle.error {
    color: #ff3b30;
  }
  .statusSubtitle {
    font-size: 1rem;
    color: #d1d1d6;
    margin-bottom: 40px;
  }

  .spinner {
    width: 60px;
    height: 60px;
    border: 5px solid rgba(255, 255, 255, 0.2);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 30px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .historyButton {
    position: absolute;
    right: 15px;
    top: 55px;
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 5px;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .historyButton:hover {
    opacity: 1;
  }
</style>