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
    if (!this.isPlaying && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.audioElement.play();
        this.isPlaying = true;
      });
    } else if (!this.isPlaying && this.audioContext.state === 'running') {
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