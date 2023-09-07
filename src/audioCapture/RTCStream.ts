import { RTCConnection } from "./RTCConnection";
import { reconnectAfterMs } from "../backoff";

/**
 * Manage a WebRTC connection to the severus backed
 * This class handles restarting the connection if it fails or disconnects
 */
export class RTCStream {
  private connection?: RTCConnection;
  private stream: MediaStream;
  private reconnectTries = 0;

  constructor(stream: MediaStream) {
    this.stream = stream;
  }

  async start() {
    if (this.connection) {
      this.connection.off("restart", this.handleRestart);
      this.connection.off("connect", this.handleConnect);
      this.connection.close();
      this.connection = undefined;
    }

    this.connection = new RTCConnection();
    this.connection.on("restart", this.handleRestart);
    this.connection.on("connect", this.handleConnect);

    await this.connection.start(this.stream);
  }

  stop() {
    if (this.connection) {
      this.connection.off("restart", this.handleRestart);
      this.connection.off("connect", this.handleConnect);
      this.connection.close();
      this.connection = undefined;
    }
  }

  private handleRestart = (connection: RTCConnection) => {
    connection.off("restart", this.handleRestart);
    connection.off("connect", this.handleConnect);

    if (this.connection) {
      this.connection.close();
      this.connection = undefined;
    }

    this.reconnectTries += 1;
    const after = reconnectAfterMs(this.reconnectTries);
    window.capture.log("debug", `rtc capture stream restarting in ${after} ms`);
    setTimeout(() => {
      // Check to see if we still need to reconnect
      if (!this.connection && this.reconnectTries > 0) {
        window.capture.log("debug", "rtc capture stream restarting");
        this.start();
      } else {
        window.capture.log("debug", `rtc capture stream restart ignored`);
      }
    }, after);
  };

  private handleConnect = () => {
    this.reconnectTries = 0;
  };

  addIceCandidate(candidate: string) {
    try {
      this.connection.addIceCandidate(JSON.parse(candidate));
    } catch (err) {
      window.capture.error(err.message);
      console.error(err);
    }
  }
}
