// src/lib/StreamingAudioPlayer.ts

export class StreamingAudioPlayer {
  private audioContext: AudioContext;
  private audioElement: HTMLAudioElement;
  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer | null = null;
  private pendingChunks: ArrayBuffer[] = [];
  private isSourceOpen = false;

  constructor() {
    this.audioContext = new AudioContext();
    this.mediaSource = new MediaSource();
    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(this.mediaSource);

    this._setupMediaSource();
  }

  /**
   * Sets up the MediaSource and its event listeners.
   */
  private _setupMediaSource() {
    this.mediaSource.addEventListener('sourceopen', () => {
      console.log('MediaSource opened.');
      this.isSourceOpen = true;

      const mime = 'audio/webm; codecs=opus';

      if (!MediaSource.isTypeSupported(mime)) {
        console.error(`Unsupported MIME type: ${mime}`);
        return;
      }
      
      // Create a SourceBuffer to hold the audio chunks [1].
      this.sourceBuffer = this.mediaSource.addSourceBuffer(mime);
      
      // This listener ensures we only append a new chunk after the previous one is done [6].
      this.sourceBuffer.addEventListener('updateend', () => {
        // If there are chunks that arrived while the buffer was busy, append the next one.
        if (this.pendingChunks.length > 0) {
          this._appendToBuffer(this.pendingChunks.shift()!);
        }
      });
      
      // Process any chunks that were received before the source was ready.
      if (this.pendingChunks.length > 0) {
        this._appendToBuffer(this.pendingChunks.shift()!);
      }
    });
  }

  /**
   * Appends a buffer to the SourceBuffer if it's not updating.
   * @param data The ArrayBuffer data chunk.
   */
  private _appendToBuffer(data: ArrayBuffer) {
    if (this.sourceBuffer && !this.sourceBuffer.updating) {
      try {
        this.sourceBuffer.appendBuffer(data);
      } catch (e) {
        console.error('Error appending buffer:', e);
      }
    }
  }

  /**
   * Adds a new audio chunk to be played.
   * @param base64AudioData The Base64 encoded audio chunk.
   */
  public addChunk(base64AudioData: string) {
    const chunk = this._base64ToArrayBuffer(base64AudioData);

    // If the source buffer is ready and not busy, append immediately.
    // Otherwise, queue the chunk to be processed later [6].
    if (this.sourceBuffer && !this.sourceBuffer.updating) {
      this._appendToBuffer(chunk);
    } else {
      this.pendingChunks.push(chunk);
    }
  }

  /**
   * Converts a Base64 string to an ArrayBuffer.
   */
  private _base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Starts playback. Must be called after a user interaction.
   */
  public async play() {
    await this.audioElement.play();
    console.log('Audio playback started.');
  }

  /**
   * Unlocks audio context and starts playback.
   */
  public async unlockAudio() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('AudioContext resumed successfully!');
    }
    await this.play();
  }
  
  // Your playWhiteNoise function can remain as is for debugging.
  public async playWhiteNoise() {
    // ... (implementation is unchanged)
  }
}