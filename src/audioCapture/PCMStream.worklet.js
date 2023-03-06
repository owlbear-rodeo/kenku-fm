const STATE = {
  // Flag for Atomics.wait() and notify()
  REQUEST_SEND: 0,
};

/**
 * 16Bit PCM data stream that will post a message when a ring buffer with a size
 * of the input parameter `bufferSize` completes a full cycle
 */
class PCMStream extends AudioWorkletProcessor {
  /** @type {Int16Array} - Ring buffer of audio data */
  buffer;
  /** @type {Int32Array} - Shared states between this and the sender */
  states;
  /** @type {number} - Current index of the ring buffer */
  pointer;
  /** @type {boolean} - Has the processor received the shared buffers */
  isInitialized;

  constructor(config) {
    super(config);
    this.pointer = 0;
    this.isInitialized = false;
    this.port.onmessage = (event) => {
      this.states = new Int32Array(event.data.states);
      this.buffer = new Int16Array(event.data.buffer);
      this.isInitialized = true;
    };
  }

  /**
   * @param {Float32Array[][]} inputs
   */
  process(inputs) {
    if (!this.isInitialized) return true;

    const input = inputs[0];
    // Ensure input is a stereo signal
    if (input && input.length === 2) {
      const samples = this.interleave(input);
      const pcm = this.floatTo16BitPCM(samples);
      this.bufferPCM(pcm);
    }
    return true;
  }

  /**
   * Add PCM data to the ring buffer and post the data back
   * to the main thread once the buffer is full
   * @param {Int16Array} pcm
   */
  bufferPCM(pcm) {
    for (let i = 0; i < pcm.length; i++) {
      this.buffer[this.pointer] = pcm[i];
      this.pointer = (this.pointer + 1) % this.buffer.length;
      if (this.pointer === 0) {
        // Notify worker
        Atomics.notify(this.states, STATE.REQUEST_SEND, 1);
      }
    }
  }

  /**
   * Convert from 32 bit float samples to 16 bit int
   * @param {Float32Array} samples
   * @returns {Int16Array}
   */
  floatTo16BitPCM(samples) {
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      // Clamp sample
      var s = Math.max(-1, Math.min(1, samples[i]));
      // Map to int16 range (-32,768 to +32,767)
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm;
  }

  /**
   * Interleave stereo samples to match PCM format
   * @param {[Float32Array, Float32Array]} input
   * @returns {Float32Array}
   */
  interleave(input) {
    const left = input[0];
    const right = input[1];
    const length = left.length + right.length;
    const result = new Float32Array(length);

    let index = 0;
    let inputIndex = 0;

    while (index < length) {
      result[index++] = left[inputIndex];
      result[index++] = right[inputIndex];
      inputIndex++;
    }

    return result;
  }
}

registerProcessor("pcm-stream", PCMStream);
