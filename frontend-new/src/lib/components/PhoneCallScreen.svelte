<!-- src/lib/components/PhoneCallScreen.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import FaMicrophoneSlash from 'svelte-icons/fa/FaMicrophoneSlash.svelte'
  import FaPhoneSlash from 'svelte-icons/fa/FaPhoneSlash.svelte'
  import FaPhone from 'svelte-icons/fa/FaPhone.svelte'
  
  import UnmuteConfigurator from '$lib/components/UnmuteConfigurator.svelte';
  import { DEFAULT_UNMUTE_CONFIG, type UnmuteConfig } from '$lib/config';

  // These are plain TS/JS files you'll create in `src/lib`
  import { useMicrophoneAccess } from '$lib/useMicrophoneAccess';
  import { useAudioProcessor } from '$lib/useAudioProcessor';
  import { base64EncodeOpus } from '$lib/audioUtil';
  import type { ChatMessage } from '$lib/chatHistory';

  import { now } from '$lib/stores';

  export let name: string = 'Anka';
  export let imageUrl: string = '/anka-profile.png';
  
  let isOngoing: boolean = false;
  let callDuration: number = 0;
  
  let unmuteConfig: UnmuteConfig = DEFAULT_UNMUTE_CONFIG;
  let callStartTime: Date | null = null;
  let shouldConnect = false; // This is our main trigger for the connection
  let ws: WebSocket | null = null;
  let readyState: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'FAILED' = 'CLOSED';
  let rawChatHistory: ChatMessage[] = []; // To store conversation text if needed
  let isReady = false;
  let setupAudio: (mediaStream: MediaStream) => Promise<any>;
  let shutdownAudio: () => void;
  let processorStore: Writable<AudioProcessor | null>;

  onMount(() => {
    const audioProcessor = useAudioProcessor(onOpusRecorded);
    
    setupAudio = audioProcessor.setupAudio;
    shutdownAudio = audioProcessor.shutdownAudio;
    processorStore = audioProcessor.processorStore;
    
    isReady = true;

    return () => {
      if (shutdownAudio) shutdownAudio();
    };
  });

  // These functions are imported from the files you will create below.
  const { askMicrophoneAccess, microphoneAccessStatus } = useMicrophoneAccess();

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  function onOpusRecorded(opus: Uint8Array) {
    if (ws && readyState === 'OPEN') {
      ws.send(JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64EncodeOpus(opus),
      }));
    }
  }

  const handleStartCall = async () => {
    if (!isReady || !setupAudio) {
        console.warn("Audio processor is not ready yet.");
        return; 
    }
    // 1. Ask for microphone permission
    const mediaStream = await askMicrophoneAccess();
    
    // 2. If we get permission, set up audio processing
    if (mediaStream) {
      readyState = 'CONNECTING';
      await setupAudio(mediaStream);
      isOngoing = true;
      callDuration = 0;
      // 3. Set our trigger to true. The reactive block below will handle the connection.
      shouldConnect = true; 
      callStartTime = new Date();
    } else {
      // Handle the case where the user denies permission
      console.error("Microphone access was denied.");
      alert("You must allow microphone access to start the call.");
    }
  };

  const handleStopCall = () => {
    isOngoing = false;
    // Set the trigger to false. The reactive block will handle disconnection.
    shouldConnect = false;
    shutdownAudio();
    callStartTime = null;
    readyState = 'CLOSED';
  };

  $: analyserNode = $processorStore?.inputAnalyser;

  $: callDuration = callStartTime 
    ? Math.round((($now.getTime() - callStartTime.getTime()) / 1000)) 
    : 0;

  $: {
    const webSocketUrl = "ws://localhost:8000/v1/realtime"; // Replace with your backend URL

    if (shouldConnect && !ws) {
      console.log("Connecting to WebSocket...");
      readyState = 'CONNECTING';
      const newWs = new WebSocket(webSocketUrl, ["realtime"]);

      newWs.onopen = () => {
        console.log("WebSocket connected!");
        readyState = 'OPEN';
        // Send initial configuration message once connected
        console.log("WebSocket connected! Sending config:", unmuteConfig);
        newWs.send(JSON.stringify({
          type: "session.update",
          session: {
            instructions: unmuteConfig.instructions,
            voice: unmuteConfig.voice,
            allow_recording: true,
          },
        }));
      };

      newWs.onmessage = (event) => {
        // Here's where you handle messages from the server
        const data = JSON.parse(event.data);
        console.log("Received message:", data.type);
        // Add your message handling logic here, e.g., playing audio
      };

      newWs.onclose = () => {
        console.log("WebSocket disconnected.");
        readyState = 'FAILED'; // Indicate failure to connect
        ws = null;
        // If the connection closes unexpectedly, update the UI state
        if (isOngoing) {
          handleStopCall();
        }
      };
      
      newWs.onerror = (error) => {
        console.error("WebSocket error:", error);
        readyState = 'FAILED'; // Indicate failure to connect
        ws = null;
        if(isOngoing) {
          handleStopCall();
        }
      };

      ws = newWs;
    } else if (!shouldConnect && ws) {
      console.log("Disconnecting WebSocket...");
      ws.close();
      ws = null;
      readyState = 'CLOSED';
    }
  }

  $: if (unmuteConfig && isOngoing && ws && readyState === 'OPEN') {
    console.log("Config changed mid-call. Sending update:", unmuteConfig);
    ws.send(JSON.stringify({
      type: "session.update",
      session: {
        instructions: unmuteConfig.instructions,
        voice: unmuteConfig.voice,
        allow_recording: true,
      },
    }));
  }
</script>

<!-- The HTML markup is mostly unchanged -->
<div class="callContainer">
  <header class="header">
    <div class="callerInfo">
      <h1>{name}</h1>
      <p style:visibility={readyState === 'CONNECTING' || readyState === 'OPEN' || readyState === 'FAILED' ? 'visible' : 'hidden'}>
        { 
          readyState === 'CONNECTING' ? 'Connecting...' :  
          readyState === 'OPEN' ? `${formatTime(callDuration)}` :
          readyState === 'FAILED' ? 'Connection failed. Please try again.' : ""
        }
      </p>
    </div>
  </header>

  <main class="mainContent">
    <div class="profileImageContainer">
      <img src={imageUrl} alt={name} class="profileImage" />
    </div>
  </main>

  <footer class="footerControls">
    {#if !isOngoing}
      <button class="controlButton startCallButton" on:click={handleStartCall}>
        <FaPhone />
      </button>
    {:else}
      <button class="controlButton">
        <FaMicrophoneSlash />
      </button>
      <button class="controlButton endCallButton" on:click={handleStopCall}>
        <FaPhoneSlash />
      </button>
    {/if}

    {#if $microphoneAccessStatus === 'denied'}
      <p class="error-text">Microphone access denied. Please enable it in your browser settings.</p>
    {/if}
  </footer>
</div>

<!-- The styles are scoped to this component by default. No special setup needed. -->
<style>
  .error-text {
    color: red;
    position: absolute;
    bottom: 20px;
    width: 100%;
    text-align: center;
  }

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
    width: 60px;
    height: 60px;
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

  .controlButton:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  .endCallButton {
    background-color: #ff3b30;
  }

  .endCallButton:active {
    background-color: #d93229;
  }

  .endCallButton:hover {
    background-color: #ff5c5c;
  }

  .startCallButton {
    background-color: #34c759;
  }

  .startCallButton:active {
    background-color: #28a745;
  }

  .startCallButton:hover {
    background-color: #45d160;
  }
</style>