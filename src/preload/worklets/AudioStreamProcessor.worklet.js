const bitDepth = 16;
const bytesPerSample = bitDepth / 8;
const numChannels = 2;
const bufferSize = 4096;

/**
 * Convert input data into 16 bit PCM data and post it back
 * with a `data` event
 */
class AudioStreamProcessor extends AudioWorkletProcessor {
  _buffer = new Uint8Array(bufferSize);
  _byte = 0;

  _add(sample) {
    this._buffer[this._byte] = sample;
    this._byte += 1;
    if (this._byte === bufferSize) {
      this._flush();
    }
  }

  _flush() {
    this.port.postMessage({
      eventType: "data",
      data: this._buffer,
    });

    this._byte = 0;
  }

  process(inputs) {
    const input = inputs[0];

    const bufferLength = input[0].length;
    // Interleave channels
    for (let i = 0; i < bufferLength; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        // Clamp input
        let sample = Math.max(-1, Math.min(1, input[channel][i]));
        // Convert float to signed 16 bits
        sample = sample * 32767.5 - 0.5;
        // Push into 8 bit array
        this._add(sample);
        this._add(sample >> 8);
      }
    }

    return true;
  }
}

registerProcessor("audio-stream-processor", AudioStreamProcessor);
