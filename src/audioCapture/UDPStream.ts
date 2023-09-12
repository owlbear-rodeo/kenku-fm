import udp from "dgram";

export class UDPStream {
  private streamSync: Worker;
  private client: udp.Socket;
  private port: number;
  constructor(streamSync: Worker) {
    this.streamSync = streamSync;
    this.client = udp.createSocket("udp4");
  }

  async start(port: number) {
    this.port = port;
    this.streamSync.addEventListener("message", this.handleSyncMessage);
  }

  stop() {
    this.streamSync.removeEventListener("message", this.handleSyncMessage);
  }

  private handleSyncMessage = (event: MessageEvent) => {
    this.client.send(event.data, this.port, "127.0.0.1");
  };
}
