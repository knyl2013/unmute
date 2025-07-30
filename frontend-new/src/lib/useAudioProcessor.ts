// src/lib/useAudioProcessor.ts

export function useAudioProcessor(onOpusRecorded: (opus: Uint8Array) => void) {
  let audioContext: AudioContext | null = null;
  let processorNode: AudioWorkletNode | null = null;
  let mediaStreamSource: MediaStreamAudioSourceNode | null = null;

  const setupAudio = async (mediaStream: MediaStream) => {
    if (!audioContext) {
      audioContext = new AudioContext({ sampleRate: 48000 });
    }
    
    // Resume context if it's suspended (e.g., due to user interaction policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    try {
      // You must have an `opus-processor.js` in your `/static` or `/public` folder
      await audioContext.audioWorklet.addModule('/opus-processor.js');
    } catch (e) {
      console.error('Failed to add audio worklet module', e);
      return;
    }
    
    processorNode = new AudioWorkletNode(audioContext, 'opus-processor');
    mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);
    mediaStreamSource.connect(processorNode);
    processorNode.connect(audioContext.destination); // Optional: if you want to hear yourself

    processorNode.port.onmessage = (event) => {
      if (event.data.type === 'opus') {
        onOpusRecorded(event.data.opus);
      }
    };
  };

  const shutdownAudio = () => {
    mediaStreamSource?.disconnect();
    processorNode?.disconnect();
    audioContext?.close().then(() => {
      audioContext = null;
      processorNode = null;
      mediaStreamSource = null;
    });
  };
  
  // Note: The original returned a ref. Here we don't need to, as the state
  // is managed internally within this closure. We can just return the functions.
  return { setupAudio, shutdownAudio, audioProcessor: { current: processorNode } };
}