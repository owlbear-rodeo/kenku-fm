const STATE = {
  REQUEST_SEND: 0,
  FRAMES_AVAILABLE: 1,
  READ_INDEX: 2,
  WRITE_INDEX: 3,
  BUFFER_LENGTH: 4,
  KERNEL_LENGTH: 5,
};

/**
 * A ring buffer node that writes to a shared array buffer
 */
class SharedBuffer extends AudioWorkletProcessor {
  /** @type {Float32Array[]} - Multichannel ring buffers of audio data */
  buffers;
  /** @type {Int32Array} - Shared states between this and the sender */
  states;
  /** @type {number} */
  bufferLength;
  /** @type {number} */
  kernelLength;
  /** @type {boolean} - Has the processor received the shared buffers */
  isInitialized;

  constructor(config) {
    super(config);
    this.pointer = 0;
    this.isInitialized = false;
    this.port.onmessage = (event) => {
      this.states = new Int32Array(event.data.states);
      this.buffers = event.data.buffers.map(
        (buffer) => new Float32Array(buffer)
      );
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
    // Ensure input and buffers have the same number of channels
    if (input && input.length === this.buffers.length) {
      this.writeInput(input);
    }
    if (this.states[STATE.FRAMES_AVAILABLE] >= this.kernelLength) {
      // Notify the worker of new frames
      Atomics.notify(this.states, STATE.REQUEST_SEND, 1);
    }
    return true;
  }

  /**
   * Write input to the ring buffer for each channel
   * @param {Float32Array[]} input
   */
  writeInput(input) {
    const writeIndex = this.states[STATE.WRITE_INDEX];
    if (writeIndex + input[0].length < this.bufferLength) {
      // Ring buffer has enough space
      for (let channel = 0; channel < input.length; channel++) {
        this.buffers[channel].set(input[channel], writeIndex);
      }
      this.states[STATE.WRITE_INDEX] += input[0].length;
    } else {
      // Ring buffer does not have enough space
      const splitIndex = this.bufferLength - writeIndex;
      for (let channel = 0; channel < input.length; channel++) {
        const firstHalf = input[channel].subarray(0, splitIndex);
        const secondHalf = input[channel].subarray(splitIndex);
        this.buffers[channel].set(firstHalf, writeIndex);
        this.buffers[channel].set(secondHalf);
        this.states[STATE.WRITE_INDEX] = secondHalf.length;
      }
    }
    this.states[STATE.FRAMES_AVAILABLE] += input[0].length;
  }
}

registerProcessor("shared-buffer", SharedBuffer);
