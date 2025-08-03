// src/lib/StreamingAudioPlayer.ts

export class StreamingAudioPlayer {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new AudioContext();
  }

  /**
   * Play white noise. For debugging to check if the sound output is working
   */
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

  /**
   * Unlock audio context
   */
  public async unlockAudio() {
    await this.audioContext.resume();
    console.log('AudioContext resumed successfully!');
  }

  /**
   * Base64 string to AudioBuffer object
   * @param base64String The Base64 string
   */
  private async base64ToAudioBuffer(base64String: string): Promise<AudioBuffer> {
      // 1. Decode the Base64 string
      // Remove the data URI prefix if present (e.g., "data:audio/wav;base64,")
      const base64WithoutPrefix = base64String.includes(';base64,') 
          ? base64String.split(';base64,')[1] 
          : base64String;

      const binaryString = atob(base64WithoutPrefix);

      // 2. Create an ArrayBuffer
      const len = binaryString.length;
      const bytes = new Uint8Array(new ArrayBuffer(len));
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }

      // 3. Decode into AudioBuffer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      return await audioContext.decodeAudioData(bytes.buffer);
  }

  /**
   * Adds a new audio chunk to the queue.
   * @param base64AudioData The Base64 encoded audio delta.
   */
  public async addChunk(base64AudioData: string) {
    const source = this.audioContext.createBufferSource();
    const audioBuffer = await this.base64ToAudioBuffer(base64AudioData);
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
  }
}