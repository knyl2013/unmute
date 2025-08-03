// src/lib/StreamingAudioPlayer.ts

export class StreamingAudioPlayer {
  private audioContext: AudioContext;
  private audioQueue: Uint8Array[] = [];
  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer | null = null;
  private audioElement: HTMLAudioElement;
  private isPlaying = false;
  private isInitialized = false;

  // IMPORTANT: You must know the MIME type of the audio stream.
  private static readonly MIME_TYPE = 'audio/webm; codecs=opus';

  constructor() {
    this.audioContext = new AudioContext();
    this.mediaSource = new MediaSource();
    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(this.mediaSource);

    this.mediaSource.addEventListener('sourceopen', this.onSourceOpen);
  }

  public async playWhiteNoise() {
    const myArrayBuffer = this.audioContext.createBuffer(
      2,
      this.audioContext.sampleRate * 3,
      this.audioContext.sampleRate,
    );

    // Fill the buffer with white noise;
    // just random values between -1.0 and 1.0
    for (let channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
      // This gives us the actual array that contains the data
      const nowBuffering = myArrayBuffer.getChannelData(channel);
      for (let i = 0; i < myArrayBuffer.length; i++) {
        // Math.random() is in [0; 1.0]
        // audio needs to be in [-1.0; 1.0]
        nowBuffering[i] = Math.random() * 2 - 1;
      }
    }

    // Get an AudioBufferSourceNode.
    // This is the AudioNode to use when we want to play an AudioBuffer
    const source = this.audioContext.createBufferSource();

    // set the buffer in the AudioBufferSourceNode
    source.buffer = myArrayBuffer;

    // connect the AudioBufferSourceNode to the
    // destination so we can hear the sound
    source.connect(this.audioContext.destination);

    // start the source playing
    source.start();
  }

  public async unlockAudio() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('AudioContext resumed successfully!');
    }
    // Now that we have user interaction, we can safely play
    this.audioElement.play().catch(e => console.error("Error playing audio:", e));
    this.isPlaying = true;
  }

  private onSourceOpen = () => {
    if (!MediaSource.isTypeSupported(StreamingAudioPlayer.MIME_TYPE)) {
      console.error(`MIME type ${StreamingAudioPlayer.MIME_TYPE} is not supported.`);
      return;
    }

    this.sourceBuffer = this.mediaSource.addSourceBuffer(StreamingAudioPlayer.MIME_TYPE);
    this.sourceBuffer.addEventListener('updateend', this.processQueue);
    this.isInitialized = true;
    this.processQueue(); // Process any chunks that arrived before initialization
  };

  /**
   * Decodes a Base64 string to a Uint8Array.
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Adds a new audio chunk to the queue.
   * @param base64AudioData The Base64 encoded audio delta.
   */
  public addChunk(base64AudioData: string) {
    const chunk = this.base64ToUint8Array(base64AudioData);
    this.audioQueue.push(chunk);

    // Start playback if this is the first chunk and context is ready
    console.log(this.audioContext.state, this.isPlaying);
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.audioElement.play();
        this.isPlaying = true;
      });
    } else if (this.audioContext.state === 'running') {
      this.audioElement.play();
      this.isPlaying = true;
    }
    
    this.processQueue();
  }

  /**
   * Processes the next chunk in the queue if the SourceBuffer is ready.
   */
  private processQueue = () => {
    if (this.isInitialized && this.sourceBuffer && !this.sourceBuffer.updating && this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift();
      if (chunk) {
        try {
          this.sourceBuffer.appendBuffer(chunk);
        } catch (error) {
          console.error('Error appending buffer:', error);
        }
      }
    }
  };

  /**
   * Stops playback and cleans up resources.
   * Should be called when the conversation turn is over.
   */
  public stop() {
    this.isPlaying = false;
    // Signal the end of the stream only if the source is open
    if (this.mediaSource.readyState === 'open' && this.sourceBuffer && !this.sourceBuffer.updating) {
      this.mediaSource.endOfStream();
    }
    this.audioElement.pause();
    this.audioQueue = []; // Clear any remaining chunks
  }
}