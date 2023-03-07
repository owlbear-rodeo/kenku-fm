/** Dedicated worker for sending stream data over websockets */

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
    postMessage("init");
  } else if (event.data.message === "data") {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(event.data.data);
    }
  }
};
