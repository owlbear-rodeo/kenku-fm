/**
 * 16Bit PCM data stream that will post a message when a ring buffer with a size
 * of the input parameter `bufferSize` completes a full cycle
 */
class PCMStream extends AudioWorkletProcessor {
  /** Ring buffer of audio data */
  buffer;
  /** Current index of the ring buffer */
  pointer;

  constructor(config) {
    super(config);
    // Buffer size in bytes
    const bufferSize = config.parameterData.bufferSize;
    this.buffer = new Int16Array(bufferSize);
    this.pointer = 0;
  }

  process(inputs) {
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
        // Copy data and post it back
        this.port.postMessage(this.buffer);
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
