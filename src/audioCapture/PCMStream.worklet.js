const STATE = {
  REQUEST_SEND: 0,
  FRAMES_AVAILABLE: 1,
  READ_INDEX: 2,
  WRITE_INDEX: 3,
  BUFFER_LENGTH: 4,
  KERNEL_LENGTH: 5,
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
  /** @type {number} */
  bufferLength;
  /** @type {number} */
  kernelLength;
  /** @type {boolean} - Has the processor received the shared buffers */
  isInitialized;
  /** @type {PCMConverter} - Converter of float to interleaved int */
  converter;

  constructor(config) {
    super(config);
    this.pointer = 0;
    this.isInitialized = false;
    this.converter = new PCMConverter();
    this.port.onmessage = (event) => {
      this.states = new Int32Array(event.data.states);
      this.buffer = new Int16Array(event.data.buffer);
      this.bufferLength = this.states[STATE.BUFFER_LENGTH];
      this.kernelLength = this.states[STATE.KERNEL_LENGTH];
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
      this.bufferPCM(this.converter.convert(input));
    }
    if (this.states[STATE.FRAMES_AVAILABLE] >= this.kernelLength) {
      // Notify the worker of new frames
      Atomics.notify(this.states, STATE.REQUEST_SEND, 1);
    }
    return true;
  }

  /**
   * Add PCM data to the ring buffer
   * @param {Int16Array} pcm
   */
  bufferPCM(pcm) {
    const writeIndex = this.states[STATE.WRITE_INDEX];
    if (writeIndex + pcm.length < this.bufferLength) {
      // Ring buffer has enough space
      this.buffer.set(pcm, writeIndex);
      this.states[STATE.WRITE_INDEX] += pcm.length;
    } else {
      // Ring buffer does not have enough space
      const splitIndex = this.bufferLength - writeIndex;
      const firstHalf = pcm.subarray(0, splitIndex);
      const secondHalf = pcm.subarray(splitIndex);
      this.buffer.set(firstHalf, writeIndex);
      this.buffer.set(secondHalf);
      this.states[STATE.WRITE_INDEX] = secondHalf.length;
    }
    this.states[STATE.FRAMES_AVAILABLE] += pcm.length;
  }
}

class PCMConverter {
  // Declare all variables upfront to avoid garbage collection
  /** @type {Float32Array} */
  interleaveLeft;
  /** @type {Float32Array} */
  interleaveRight;
  /** @type {number} */
  interleaveLength = 0;
  /** @type {Float32Array} */
  interleaveBuffer;
  /** @type {number} */
  interleaveIndex = 0;
  /** @type {number} */
  interleaveInputIndex = 0;
  /** @type {Int16Array} */
  pcmBuffer;
  /** @type {number} */
  pcmIndex = 0;
  /** @type {number} */
  pcmSample;

  /**
   *
   * @param {[Float32Array, Float32Array]} input
   * @returns {Int16Array}
   */
  convert(input) {
    return this.floatTo16BitPCM(this.interleave(input));
  }

  /**
   * Convert from 32 bit float samples to 16 bit int
   * @param {Float32Array} samples
   * @returns {Int16Array}
   */
  floatTo16BitPCM(samples) {
    if (!this.pcmBuffer) {
      this.pcmBuffer = new Int16Array(samples.length);
    }
    for (this.pcmIndex = 0; this.pcmIndex < samples.length; this.pcmIndex++) {
      // Clamp sample
      this.pcmSample = Math.max(-1, Math.min(1, samples[this.pcmIndex]));
      // Map to int16 range (-32,768 to +32,767)
      this.pcmBuffer[this.pcmIndex] =
        this.pcmSample < 0 ? this.pcmSample * 0x8000 : this.pcmSample * 0x7fff;
    }
    return this.pcmBuffer;
  }

  /**
   * Interleave stereo samples to match PCM format
   * @param {[Float32Array, Float32Array]} input
   * @returns {Float32Array}
   */
  interleave(input) {
    this.interleaveLeft = input[0];
    this.interleaveRight = input[1];
    this.interleaveLength =
      this.interleaveLeft.length + this.interleaveRight.length;
    if (!this.interleaveBuffer) {
      this.interleaveBuffer = new Float32Array(this.interleaveLength);
    }

    this.interleaveIndex = 0;
    this.interleaveInputIndex = 0;
    while (this.interleaveIndex < this.interleaveLength) {
      this.interleaveBuffer[this.interleaveIndex++] =
        this.interleaveLeft[this.interleaveInputIndex];
      this.interleaveBuffer[this.interleaveIndex++] =
        this.interleaveRight[this.interleaveInputIndex];
      this.interleaveInputIndex++;
    }
    return this.interleaveBuffer;
  }
}

registerProcessor("pcm-stream", PCMStream);
