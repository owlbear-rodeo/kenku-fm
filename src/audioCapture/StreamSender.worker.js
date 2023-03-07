/**
 * Dedicated worker for sending stream data over websockets.
 * This is used as a sub-worker in the StreamSync worker.
 * We use a sub worker so the websocket has time to flush the buffered data
 */

/** @type {WebSocket} - The websocket to sync with the main context */
let ws;

onmessage = (event) => {
  if (event.data.message === "init") {
    ws = new WebSocket(event.data.address);
    ws.addEventListener("close", (event) => {
      console.error(event);
    });
    ws.addEventListener("error", (event) => {
      console.error(event);
    });
    ws.addEventListener("open", () => {
      postMessage("init");
    });
  } else if (event.data.message === "data") {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(event.data.data);
    }
  }
};
