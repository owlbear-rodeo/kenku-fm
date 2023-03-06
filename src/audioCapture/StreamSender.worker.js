const STATE = {
  // Flag for Atomics.wait() and notify()
  REQUEST_SEND: 0,
};

/** @type {Int32Array} - Shared states between this worker and the Audio Worklet */
let States;
/** @type {Int16Array} - Shared RingBuffer between this worker and Audio Worklet */
let RingBuffer;
/** @type {WebSocket} - The websocket to sync with the main context */
let ws;

/**
 * Waits for the signal delivered via the States SharedArrayBuffer. When signaled, process
 * the audio data to send to Discord.
 */
function waitOnSendRequest() {
  // As long as REQUEST_SEND is zero keep waiting
  while (Atomics.wait(States, STATE.REQUEST_SEND, 0) === "ok") {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(new Int16Array(RingBuffer.slice()));
    }

    // Reset the request render bit, and wait again.
    Atomics.store(States, STATE.REQUEST_SEND, 0);
  }
}

onmessage = (event) => {
  States = new Int32Array(event.data.states);
  RingBuffer = new Int16Array(event.data.buffer);
  ws = new WebSocket(event.data.address);
  ws.addEventListener("close", (event) => {
    console.error(event);
  });
  ws.addEventListener("error", (event) => {
    console.error(event);
  });
  ws.addEventListener("open", () => {
    waitOnSendRequest();
  });
};
