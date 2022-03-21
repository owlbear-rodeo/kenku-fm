let ws;

onmessage = function (e) {
  if (e.data[0] === "url") {
    ws = new WebSocket(e.data[1]);
  } else if (e.data[0] === "data") {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(e.data[1]);
    }
  }
};
