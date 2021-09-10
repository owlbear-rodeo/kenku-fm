const bitDepth = 16;
const bytesPerSample = bitDepth / 8;
const numChannels = 2;

/**
 * Convert input data into 16 bit PCM data and post it back
 * with a `data` event
 */
class AudioStreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs) {
    const input = inputs[0];

    const bufferLength = input[0].length;
    let reducedData = new Uint8Array(
      bufferLength * numChannels * bytesPerSample
    );

    for (let i = 0; i < bufferLength; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        let outputIndex = (i * numChannels + channel) * bytesPerSample;
        // Clamp input
        let sample = Math.max(-1, Math.min(1, input[channel][i]));
        // Convert float to signed 16 bits
        sample = sample * 32767.5 - 0.5;
        // Push into 8 bit array
        reducedData[outputIndex] = sample;
        reducedData[outputIndex + 1] = sample >> 8;
      }
    }

    this.port.postMessage({
      eventType: "data",
      data: reducedData,
    });

    return true;
  }
}

registerProcessor("audio-stream-processor", AudioStreamProcessor);
