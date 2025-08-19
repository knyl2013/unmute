<script lang="ts">
	import { goto } from "$app/navigation";

    const handleStart = () => {
        goto('/call');
    };
</script>

<div class="pageContainer">
    <!-- This main element will contain all the scrollable content -->
    <main class="scrollableContent">
        <!-- Section 1: Hero -->
        <section class="featureSection">
            <div class="textContent">
                <h1 class="headline">Master Your IELTS Speaking.</h1>
                <p class="sub-headline">
                    Practice with an AI examiner anytime, anywhere. Get instant, detailed feedback to boost
                    your confidence and your score.
                </p>
            </div>
            <img src="/screenshots/call.png" alt="IELTS AI Examiner call screen" class="screenshot" />
        </section>

        <!-- Section 2: Instant Score -->
        <section class="featureSection">
            <div class="textContent">
                <h2 class="headline">Receive Your AI-Powered Report.</h2>
                <p class="sub-headline">
                    Finish a conversation and immediately see your estimated IELTS band score, just like the
                    real test.
                </p>
            </div>
            <img
                src="/screenshots/report-score.png"
                alt="IELTS report showing an overall score"
                class="screenshot"
            />
        </section>

        <!-- Section 3: Specific Suggestions -->
        <section class="featureSection">
            <div class="textContent">
                <h2 class="headline">Get Actionable Advice.</h2>
                <p class="sub-headline">
                    Don't just see your score. Understand exactly how to improve with specific, word-for-word
                    suggestions on grammar, vocabulary, and phrasing.
                </p>
            </div>
            <img
                src="/screenshots/suggestions.png"
                alt="Specific suggestions for improving spoken English"
                class="screenshot"
            />
        </section>

        <!-- Section 4: Track Progress -->
        <section class="featureSection">
            <div class="textContent">
                <h2 class="headline">Track Your Journey to Success.</h2>
                <p class="sub-headline">
                    Watch your score progress over time. Our detailed history and charts help you identify
                    patterns and focus your efforts where they matter most.
                </p>
            </div>
            <img
                src="/screenshots/progress.png"
                alt="Chart showing IELTS score progression over time"
                class="screenshot"
            />
        </section>
    </main>

    <!-- This footer stays fixed at the bottom of the screen -->
    <footer class="fixedCtaFooter">
        <button class="ctaButton" on:click={handleStart}> Start Practicing for Free </button>
    </footer>
</div>

<style>
    :global(body) {
        margin: 0;
        background: radial-gradient(circle at 50% 50%, #5a4743, #3a2723);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
            sans-serif;
        color: #ffffff;
    }

    .pageContainer {
        width: 100%;
    }

    .scrollableContent {
        padding-bottom: 120px;
    }

    .featureSection {
        min-height: 100vh;
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 60px 20px;
        box-sizing: border-box;
    }

    .textContent {
        max-width: 700px;
        margin-bottom: 50px;
    }

    .headline {
        font-size: clamp(2.5rem, 6vw, 4.5rem);
        font-weight: 700;
        margin: 0 0 15px 0;
        letter-spacing: -0.02em;
    }

    .sub-headline {
        font-size: clamp(1rem, 2.5vw, 1.5rem);
        font-weight: 400;
        color: #d1d1d6;
        line-height: 1.5;
        max-width: 550px;
        margin: 0 auto;
    }

    .screenshot {
        max-width: 380px;
        width: 80%;
        border-radius: 30px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
        transition: transform 0.3s ease;
    }

    .screenshot:hover {
        transform: scale(1.03);
    }

    .fixedCtaFooter {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        z-index: 100;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px 20px 30px; /* Extra bottom padding for mobile home bars */
        background: linear-gradient(to top, rgba(58, 39, 35, 1) 20%, rgba(58, 39, 35, 0.8) 70%, rgba(58, 39, 35, 0));
        pointer-events: none;
    }

    .ctaButton {
        background-color: #34c759;
        color: white;
        font-size: 1.1rem;
        font-weight: 600;
        border: none;
        border-radius: 9999px;
        padding: 18px 35px;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.2s ease;
        pointer-events: auto;
    }

    .ctaButton:hover {
        background-color: #34c759;
        transform: scale(1.05);
    }
</style>