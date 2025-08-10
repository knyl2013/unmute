<script lang="ts">
  import { reportStore } from '$lib/stores';
  import { goto } from '$app/navigation';

  // Subscribe to the store to get reactive updates
  $: reportState = $reportStore;

  // Helper to format the criterion keys into readable titles
  const formatCriterionName = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  };
</script>

<div class="reportContainer">
  {#if reportState.status === 'generating'}
    <!-- Loading State -->
    <div class="statusContainer">
      <div class="spinner"></div>
      <h1 class="statusTitle">Generating Report</h1>
      <p class="statusSubtitle">Analyzing your conversation, please wait...</p>
    </div>
  {:else if reportState.status === 'error'}
    <!-- Error State -->
    <div class="statusContainer">
      <h1 class="statusTitle error">Report Failed</h1>
      <p class="statusSubtitle">{reportState.error || 'An unknown error occurred.'}</p>
      <div class="footerControls">
        <a href="/" class="actionButton start">Try Again</a>
      </div>
    </div>
  {:else if reportState.status === 'success' && reportState.data}
    {@const report = reportState.data}
    <!-- Success State: The Main Report -->
    <header class="header">
      <button class="backButton" on:click={() => goto('/')} aria-label="Back">
        <!-- SVG for Back Chevron -->
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="white"/>
        </svg>
      </button>
      <div class="callerInfo">
        <h1>Your IELTS Report</h1>
        <p>A detailed breakdown of your performance</p>
      </div>
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

    <footer class="footerControls">
      <a href="/" class="actionButton start">Start a New Call</a>
    </footer>
  {/if}
</div>

<style>
  /* Base Container & Font (copied from your style) */
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
</style>