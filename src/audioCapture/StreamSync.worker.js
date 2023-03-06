const STATE = {
  REQUEST_SEND: 0,
  FRAMES_AVAILABLE: 1,
  READ_INDEX: 2,
  WRITE_INDEX: 3,
  BUFFER_LENGTH: 4,
  KERNEL_LENGTH: 5,
};

/** @type {Int32Array} - Shared states between this worker and the Audio Worklet */
let states;
/** @type {Int16Array} - Shared ring buffer between this worker and Audio Worklet */
let buffer;
/** @type {number} */
let bufferLength;
/** @type {number} */
let kernelLength;

/**
 * Waits for the signal delivered via the States SharedArrayBuffer. When signaled, process
 * the audio data to send to Discord.
 */
function waitOnSendRequest() {
  // As long as REQUEST_SEND is zero keep waiting
  while (Atomics.wait(states, STATE.REQUEST_SEND, 0) === "ok") {
    // Get the data to send
    let readIndex = states[STATE.READ_INDEX];
    const data = new Int16Array(kernelLength);
    for (let i = 0; i < kernelLength; i++) {
      data[i] = buffer[readIndex];
      readIndex++;
      if (readIndex === bufferLength) {
        readIndex = 0;
      }
    }
    states[STATE.READ_INDEX] = readIndex;

    // Mark frames as processed
    states[STATE.FRAMES_AVAILABLE] -= kernelLength;

    // Send data via the WebSocket
    // Make sure to setup data as a transferable to prevent copying
    postMessage(data, [data.buffer]);

    // Reset the request render bit, and wait again.
    Atomics.store(states, STATE.REQUEST_SEND, 0);
  }
}

onmessage = (event) => {
  states = new Int32Array(event.data.states);
  bufferLength = states[STATE.BUFFER_LENGTH];
  kernelLength = states[STATE.KERNEL_LENGTH];
  buffer = new Int16Array(event.data.buffer);
  waitOnSendRequest();
};
