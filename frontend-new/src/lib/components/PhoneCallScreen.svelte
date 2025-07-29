<!-- src/lib/components/PhoneCallScreen.svelte -->

<script lang="ts">
  import { onMount } from 'svelte';

  import FaVolumeUp from 'svelte-icons/fa/FaVolumeUp.svelte'
  import FaMicrophoneSlash from 'svelte-icons/fa/FaMicrophoneSlash.svelte'
  import FaArrowLeft from 'svelte-icons/fa/FaArrowLeft.svelte'
  import FaPhoneSlash from 'svelte-icons/fa/FaPhoneSlash.svelte'

  // Props are declared with 'export let'. We can give them default values.
  export let name: string = 'Anka';
  export let imageUrl: string = '/anka-profile.png';

  // This is our reactive state. When it changes, the UI updates automatically.
  let callDuration: number = 4;

  // Helper function to format the time
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // onMount is a lifecycle function that runs once the component is in the DOM.
  // It's the perfect place for setting up intervals or fetching data.
  onMount(() => {
    const timerId = setInterval(() => {
      // Svelte's reactivity: just update the variable! No setState needed.
      callDuration += 1;
    }, 1000);

    // The function returned from onMount runs when the component is destroyed.
    // This is how we clean up the interval to prevent memory leaks.
    return () => {
      clearInterval(timerId);
    };
  });
</script>

<!-- The HTML markup is clean and straightforward -->
<div class="callContainer">

  <!-- Header Section -->
  <header class="header">
    <button class="backButton" style="width: 32px; height: 32px">
      <FaArrowLeft/>
    </button>
    <div class="callerInfo">
      <h1>{name}</h1>
      <p>{formatTime(callDuration)}</p>
    </div>
  </header>

  <!-- Main Content: Profile Picture -->
  <main class="mainContent">
    <div class="profileImageContainer">
      <img src={imageUrl} alt={name} class="profileImage" />
    </div>
  </main>

  <!-- Footer: Action Buttons -->
  <footer class="footerControls">
    <button class="controlButton" style="width: 50px; height: 50px">
      <FaVolumeUp />
    </button>
    <button class="controlButton" style="width: 50px; height: 50px">
      <FaMicrophoneSlash />
    </button>
    <button class="controlButton endCallButton" style="width: 50px; height: 50px">
      <FaPhoneSlash />
    </button>
  </footer>

</div>

<!-- The styles are scoped to this component by default. No special setup needed. -->
<style>
  /* You can copy the exact same CSS here. It just works. */
  .callContainer {
    width: 375px;
    height: 100vh;
    border-radius: 40px;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: radial-gradient(circle at 50% 50%, #5a4743, #3a2723);
  }

  .header {
    padding: 50px 20px 20px;
    text-align: center;
    position: relative;
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
    font-weight: 500;
  }

  .mainContent {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .profileImageContainer {
    width: 220px;
    height: 220px;
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .profileImage {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .footerControls {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0 20px 50px 20px;
  }

  .controlButton {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .controlButton:active {
    background-color: rgba(255, 255, 255, 0.4);
  }

  .endCallButton {
    background-color: #ff3b30;
  }

  .endCallButton:active {
    background-color: #d93229;
  }
</style>