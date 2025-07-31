// src/lib/audioProcessor.ts
import OpusRecorder from 'opus-recorder';
import { writable, type Readable } from 'svelte/store';

// --- Helper function (can be kept private to this module) ---
const getAudioWorkletNode = async (
  audioContext: AudioContext,
  name: string
) => {
  // This is a common pattern to avoid re-adding the module if it's already there.
  try {
    return new AudioWorkletNode(audioContext, name);
  } catch (e) {
    // IMPORTANT: This requires `/audio-output-processor.js` to be in your `/static` folder.
    await audioContext.audioWorklet.addModule(`/${name}.js`);
    return new AudioWorkletNode(audioContext, name, {});
  }
};


// --- The exported interface remains the same ---
export interface AudioProcessor {
  audioContext: AudioContext;
  opusRecorder: OpusRecorder;
  decoder: Worker;
  outputWorklet: AudioWorkletNode;
  inputAnalyser: AnalyserNode;
  outputAnalyser: AnalyserNode;
  mediaStreamDestination: MediaStreamAudioDestinationNode;
}


// --- The Factory Function (replaces the React hook) ---
export function useAudioProcessor(onOpusRecorded: (chunk: Uint8Array) => void) {
  
  // This `let` variable replaces `useRef`. It's part of the closure
  // and will persist as long as the returned functions are in scope.
  let audioProcessor: AudioProcessor | null = null;
  
  // A Svelte store to reactively broadcast the processor's state.
  const processorStore = writable<AudioProcessor | null>(null);

  // `setupAudio` is now a regular async function. No `useCallback` needed.
  const setupAudio = async (mediaStream: MediaStream): Promise<AudioProcessor | undefined> => {
    if (audioProcessor) return audioProcessor;

    const audioContext = new AudioContext({ sampleRate: 48000 }); // Opus works best at 48kHz
    const outputWorklet = await getAudioWorkletNode(audioContext, "audio-output-processor");
    
    const source = audioContext.createMediaStreamSource(mediaStream);
    const inputAnalyser = audioContext.createAnalyser();
    inputAnalyser.fftSize = 2048;
    source.connect(inputAnalyser);

    const mediaStreamDestination = audioContext.createMediaStreamDestination();
    outputWorklet.connect(mediaStreamDestination);
    
    // If you want to hear your own microphone (loopback)
    // source.connect(mediaStreamDestination);

    outputWorklet.connect(audioContext.destination);
    const outputAnalyser = audioContext.createAnalyser();
    outputAnalyser.fftSize = 2048;
    outputWorklet.connect(outputAnalyser);

    // IMPORTANT: This requires `/decoderWorker.min.js` to be in your `/static` folder.
    const decoder = new Worker("/decoderWorker.min.js");
    let micDuration = 0;

    decoder.onmessage = (event: MessageEvent<any>) => {
      if (!event.data) return;
      outputWorklet.port.postMessage({
        frame: event.data[0],
        type: "audio",
        micDuration: micDuration,
      });
    };
    decoder.postMessage({
        command: "init",
        bufferLength: (960 * audioContext.sampleRate) / 24000,
        decoderSampleRate: 24000,
        outputBufferSampleRate: audioContext.sampleRate,
        resampleQuality: 0,
    });
    
    // IMPORTANT: This requires `/encoderWorker.min.js` to be in your `/static` folder.
    const recorderOptions = {
      encoderPath: "/encoderWorker.min.js",
      encoderSampleRate: 48000, // Opus internal sample rate
      numberOfChannels: 1,
      encoderApplication: 2049, // Voice
      encoderFrameSize: 20, // 20ms
      streamPages: true,
      audioContext: audioContext,
      bufferLength: 4096, // Default buffer length
      maxFramesPerPage: 40, // Default max frames per page
      recordingGain: 1.0, // Default gain
      resampleQuality: 0, // Default resample quality
      encoderComplexity: 5 // Default encoder complexity
    };

    const opusRecorder = new OpusRecorder(recorderOptions);

    await opusRecorder.initialize;

    opusRecorder.ondataavailable = (data: Uint8Array) => {
      micDuration = opusRecorder.encodedSamplePosition / 48000;
      onOpusRecorded(data);
    };

    // This assigns the created object to our closure variable.
    audioProcessor = {
      audioContext,
      opusRecorder,
      decoder,
      outputWorklet,
      inputAnalyser,
      outputAnalyser,
      mediaStreamDestination,
    };
    
    // Update the store to notify subscribers.
    processorStore.set(audioProcessor);

    // This is a new step. We need to connect the microphone source to the recorder.
    source.connect(opusRecorder.encoderNode);
    
    await audioContext.resume();
    opusRecorder.start();

    return audioProcessor;
  };

  // `shutdownAudio` is also just a regular function.
  const shutdownAudio = () => {
    if (audioProcessor) {
      const { audioContext, opusRecorder, outputWorklet, decoder } = audioProcessor;
      
      opusRecorder.stop();
      decoder.terminate();
      outputWorklet.disconnect();
      audioContext.close();
      
      // Clear the closure variable and update the store.
      audioProcessor = null;
      processorStore.set(null);
    }
  };

  // We return the control functions and the readable store.
  return {
    setupAudio,
    shutdownAudio,
    processorStore
  };
}