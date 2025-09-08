/** Exponential backoff for Websocket and RTC reconnects */
export const reconnectAfterMs = (tries: number) => {
  const backoff =
    [10, 50, 100, 150, 200, 250, 500, 1000, 2000][tries - 1] || 5000;
  const sleep = Math.floor(Math.random() * (backoff - 1)) + 0;
  return sleep;
};
