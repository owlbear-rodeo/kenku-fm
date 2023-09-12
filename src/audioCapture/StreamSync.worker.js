const STATE = {
  REQUEST_SEND: 0,
  FRAMES_AVAILABLE: 1,
  READ_INDEX: 2,
  WRITE_INDEX: 3,
  BUFFER_LENGTH: 4,
  KERNEL_LENGTH: 5,
};

/** Sync data from the Audio Worklet and convert it to PCM */
class Sync {
  /** @type {Int32Array} - Shared states between this worker and the Audio Worklet */
  states;
  /** @type {Float32Array[]} - Shared ring buffers between this worker and Audio Worklet */
  buffers;
  /** @type {number} - The length of the internal buffer in samples  */
  bufferLength;
  /** @type {number} - The length of the output kernel in samples */
  kernelLength;

  constructor(states, buffers, bufferLength, kernelLength) {
    this.states = states;
    this.buffers = buffers;
    this.bufferLength = bufferLength;
    this.kernelLength = kernelLength;
  }

  /**
   * Waits for the signal delivered via the States SharedArrayBuffer. When signaled, process
   * the audio data to send to Discord.
   */
  waitOnSendRequest() {
    // As long as REQUEST_SEND is zero keep waiting
    while (Atomics.wait(this.states, STATE.REQUEST_SEND, 0) === "ok") {
      const result = new ArrayBuffer(
        this.kernelLength * Int16Array.BYTES_PER_ELEMENT * this.buffers.length
      );
      const pcm = new Int16Array(result);

      // Start reading from the current read index
      let readIndex = this.states[STATE.READ_INDEX];
      let index = 0;
      let channel = 0;
      let sample;
      let pcmIndex = 0;
      for (index = 0; index < this.kernelLength; index++) {
        for (channel = 0; channel < this.buffers.length; channel++) {
          // Get float sample for this channel
          sample = this.buffers[channel][readIndex];
          // Clamp float sample
          sample = Math.max(-1, Math.min(1, sample));
          // Convert to Int16 PCM data
          pcm[pcmIndex] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          pcmIndex++;
        }
        readIndex++;
        // Loop back around the buffer if needed
        if (readIndex >= this.bufferLength) {
          readIndex = 0;
        }
      }

      // Update shared state read index
      this.states[STATE.READ_INDEX] = readIndex;
      // Mark frames as processed
      this.states[STATE.FRAMES_AVAILABLE] -= this.kernelLength;

      const bytes = new Uint8Array(result);

      // Send PCM data back to main thread
      postMessage(bytes, [bytes.buffer]);

      // Reset the request render bit, and wait again.
      Atomics.store(this.states, STATE.REQUEST_SEND, 0);
    }
  }
}

onmessage = (event) => {
  const states = new Int32Array(event.data.states);
  const bufferLength = states[STATE.BUFFER_LENGTH];
  const kernelLength = states[STATE.KERNEL_LENGTH];
  const buffers = event.data.buffers.map((buffer) => new Float32Array(buffer));
  const sync = new Sync(states, buffers, bufferLength, kernelLength);
  sync.waitOnSendRequest();
};
