import Sender from "./StreamSender.worker";

const STATE = {
  REQUEST_SEND: 0,
  FRAMES_AVAILABLE: 1,
  READ_INDEX: 2,
  WRITE_INDEX: 3,
  BUFFER_LENGTH: 4,
  KERNEL_LENGTH: 5,
};

/** @type {Worker} - A sub worker for sending the stream over websocket */
const streamSender = new Sender();

/** Sync data from the Audio Worklet and convert it to PCM */
class Sync {
  /** @type {Int32Array} - Shared states between this worker and the Audio Worklet */
  states;
  /** @type {Float32Array[]} - Shared ring buffers between this worker and Audio Worklet */
  buffers;
  /** @type {Float32Array[]} - Buffers used for each send request kernel */
  kernelBuffers;
  /** @type {number} */
  bufferLength;
  /** @type {number} */
  kernelLength;
  /** @type {PCMConverter} */
  converter;

  constructor(states, buffers, bufferLength, kernelLength) {
    this.states = states;
    this.buffers = buffers;
    this.kernelBuffers = this.buffers.map(() => new Float32Array(kernelLength));
    this.bufferLength = bufferLength;
    this.kernelLength = kernelLength;
    this.converter = new PCMConverter();
  }

  /**
   * Waits for the signal delivered via the States SharedArrayBuffer. When signaled, process
   * the audio data to send to Discord.
   */
  waitOnSendRequest() {
    // As long as REQUEST_SEND is zero keep waiting
    while (Atomics.wait(this.states, STATE.REQUEST_SEND, 0) === "ok") {
      // Get the data to send
      let readIndex = this.states[STATE.READ_INDEX];
      for (let i = 0; i < this.kernelLength; i++) {
        for (let channel = 0; channel < this.buffers.length; channel++) {
          this.kernelBuffers[channel][i] = this.buffers[channel][readIndex];
        }
        readIndex++;
        if (readIndex === this.bufferLength) {
          readIndex = 0;
        }
      }

      this.states[STATE.READ_INDEX] = readIndex;

      // Mark frames as processed
      this.states[STATE.FRAMES_AVAILABLE] -= this.kernelLength;

      // Send PCM data to the sub worker
      const data = this.converter.convert(this.kernelBuffers).slice();
      streamSender.postMessage({ message: "data", data }, [data.buffer]);

      // Reset the request render bit, and wait again.
      Atomics.store(this.states, STATE.REQUEST_SEND, 0);
    }
  }
}

class PCMConverter {
  /** @type {Float32Array} */
  interleaveBuffer;
  /** @type {Int16Array} */
  pcmBuffer;

  /**
   *
   * @param {Float32Array[]} input
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
    let s;
    for (let i = 0; i < samples.length; i++) {
      // Clamp sample
      s = Math.max(-1, Math.min(1, samples[i]));
      // Map to int16 range (-32,768 to +32,767)
      this.pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return this.pcmBuffer;
  }

  /**
   * Interleave multichannel samples to match PCM format
   * @param {Float32Array[]} input
   * @returns {Float32Array}
   */
  interleave(input) {
    let length = 0;
    let channel = 0;
    for (channel = 0; channel < input.length; channel++) {
      length += input[channel].length;
    }
    if (!this.interleaveBuffer) {
      this.interleaveBuffer = new Float32Array(length);
    }

    let index = 0;
    let inputIndex = 0;
    while (index < length) {
      for (channel = 0; channel < input.length; channel++) {
        this.interleaveBuffer[index] = input[channel][inputIndex];
        index++;
      }
      inputIndex++;
    }
    return this.interleaveBuffer;
  }
}

onmessage = (event) => {
  const states = new Int32Array(event.data.states);
  const bufferLength = states[STATE.BUFFER_LENGTH];
  const kernelLength = states[STATE.KERNEL_LENGTH];
  const buffers = event.data.buffers.map((buffer) => new Float32Array(buffer));
  const sync = new Sync(states, buffers, bufferLength, kernelLength);
  streamSender.postMessage({
    message: "init",
    address: event.data.websocketAddress,
  });
  streamSender.onmessage = () => {
    sync.waitOnSendRequest();
  };
};
