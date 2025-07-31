<script lang="ts">
  import { onMount } from 'svelte';
  // Import everything from our new shared file
  import {
    DEFAULT_UNMUTE_CONFIG,
    fetchVoices,
    getVoiceName,
    instructionsToPlaceholder,
    type Instructions,
    type UnmuteConfig,
    type VoiceSample
  } from '$lib/config';

  // Import child components (assuming you have converted them)
  // import SquareButton from './SquareButton.svelte';
  // import Modal from './Modal.svelte';
  // import VoiceUpload from './VoiceUpload.svelte';
  import { ArrowUpRight } from 'lucide-svelte';


  // --- PROPS ---
  // This is the magic! `bind:config` in the parent will create a two-way binding.
  // When we update `config` here, the parent's `unmuteConfig` will update automatically.
  export let config: UnmuteConfig;

  export let backendServerUrl: string;
  export let voiceCloningUp: boolean = false;


  // --- STATE ---
  let voices: VoiceSample[] | null = null;
  let customInstructionsText = ''; // We'll bind the textarea to this

  // --- DERIVED STATE (Reactive Statements) ---
  // These are like `useMemo` in React. They re-run when their dependencies change.
  $: activeVoice = voices?.find((v) => v.source.path_on_server === config.voice);
  $: defaultInstructions = activeVoice?.instructions || DEFAULT_UNMUTE_CONFIG.instructions;

  // --- LIFECYCLE (onMount is like useEffect with an empty dependency array) ---
  onMount(async () => {
    if (backendServerUrl) {
      const voicesData = await fetchVoices(backendServerUrl);
      voices = voicesData;

      if (voicesData.length > 0) {
        // Set a random initial voice when the component loads
        const randomVoice = voicesData[Math.floor(Math.random() * voicesData.length)];
        // THIS IS THE KEY: We assign to the bound `config` object.
        // This updates the state in the parent PhoneCallScreen component.
        config = {
          voice: randomVoice.source.path_on_server,
          voiceName: getVoiceName(randomVoice),
          instructions: randomVoice.instructions || DEFAULT_UNMUTE_CONFIG.instructions,
          isCustomInstructions: false,
        };
      }
    }
  });

  // --- REACTIVE LOGIC (like useEffect with dependencies) ---
  // This block runs whenever `customInstructionsText` changes.
  $: {
    const updatedInstructions: Instructions | null = customInstructionsText
      ? { type: 'constant', text: customInstructionsText, language: 'en/fr' }
      : null;
    
    // Update the main config object. Svelte's reactivity takes care of the rest.
    config = {
      ...config,
      instructions: updatedInstructions || defaultInstructions,
      isCustomInstructions: !!updatedInstructions,
    };
  }
  
  function selectVoice(voice: VoiceSample) {
    config = {
      // Keep existing custom instructions if they exist
      ...config,
      voice: voice.source.path_on_server,
      voiceName: getVoiceName(voice),
      // If we are not using custom instructions, switch to the character's default instructions
      instructions: config.isCustomInstructions ? config.instructions : (voice.instructions || defaultInstructions),
    }
  }

</script>

{#if !voices}
  <div class="w-full">
    <p class="text-lightgray">Loading characters...</p>
  </div>
{:else}
  <div class="w-full flex flex-col items-center">
    <!-- UI Layout... this is a simplified version of the JSX -->
    <div class="w-full max-w-6xl p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- Character Selection -->
      <div>
        <h2 class="text-lightgray mb-2">Character</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          {#each voices as voice (voice.source.path_on_server)}
            <!-- Assuming a SquareButton.svelte component exists -->
            <button
              on:click={() => selectVoice(voice)}
              class="p-2 border"
              class:bg-blue-500={voice.source.path_on_server === config.voice}
              class:text-white={voice.source.path_on_server === config.voice}
            >
              / {getVoiceName(voice)} /
            </button>
          {/each}
        </div>
      </div>

      <!-- Instructions Textarea -->
      <div>
        <h2 class="text-lightgray mb-2">Instructions</h2>
        <textarea
          bind:value={customInstructionsText}
          placeholder={instructionsToPlaceholder(defaultInstructions)}
          class="bg-gray-800 text-white text-sm w-full p-2 resize-none h-32"
        />
      </div>
    </div>
  </div>
{/if}
