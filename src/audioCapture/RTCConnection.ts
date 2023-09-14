import { TypedEmitter } from "tiny-typed-emitter";

export interface RTCConnectionEvents {
  restart: (connection: RTCConnection) => void;
  connect: (connection: RTCConnection) => void;
}

/**
 * A single WebRTC connection to the severus backed
 */
export class RTCConnection extends TypedEmitter<RTCConnectionEvents> {
  private peerConnection: RTCPeerConnection;
  /** Has this connection been manually closed. Used to determine whether it should be restarted */
  private closed = false;

  async start(stream: MediaStream): Promise<void> {
    try {
      await window.capture.rtcCreateConnection();

      const config = {
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      };

      this.peerConnection = new RTCPeerConnection(config);

      stream
        .getTracks()
        .forEach((track) => this.peerConnection.addTrack(track, stream));

      let makingOffer = true;
      let bufferedCandidates: RTCIceCandidate[] = [];
      this.peerConnection.onnegotiationneeded = async () => {
        try {
          window.capture.log("debug", "renderer rtc stream negotiating");
          const offer = await this.peerConnection.createOffer();
          console.log(offer);
          offer.sdp = offer.sdp.replace(
            "minptime=10;useinbandfec=1",
            // Increase bitrate and enable stereo
            "minptime=10;useinbandfec=1;maxaveragebitrate=128000;stereo=1;sprop-stereo=1"
          );
          await this.peerConnection.setLocalDescription(offer);
          const answer = await window.capture.rtcSignal(
            JSON.stringify(this.peerConnection.localDescription)
          );
          console.log(answer);
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(answer))
          );
          makingOffer = false;
          for (const candidate of bufferedCandidates) {
            await window.capture.rtcAddCandidate(JSON.stringify(candidate));
          }

          await window.capture.stream();
          window.capture.log("debug", "renderer rtc stream ended");
          if (!this.closed) {
            this.emit("restart", this);
          }
        } catch (err) {
          window.capture.log("error", err.message);
        }
      };

      this.peerConnection.onicecandidate = async ({ candidate }) => {
        if (candidate) {
          if (makingOffer) {
            bufferedCandidates.push(candidate);
          } else {
            await window.capture.rtcAddCandidate(JSON.stringify(candidate));
          }
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        window.capture.log(
          "debug",
          `renderer ice connection state changed: ${this.peerConnection.iceConnectionState}`
        );
        if (this.peerConnection.iceConnectionState === "connected") {
          this.emit("connect", this);
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        window.capture.log(
          "debug",
          `renderer peer connection state changed: ${this.peerConnection.connectionState}`
        );
      };

      this.peerConnection.onicecandidateerror = (
        e: RTCPeerConnectionIceErrorEvent
      ) => {
        window.capture.log(
          "error",
          `renderer ICE candidate error: ${e.errorText} with code: ${e.errorCode}`
        );
      };
    } catch (err) {
      window.capture.log("error", err.message);
    }
  }

  close() {
    this.closed = true;
    this.peerConnection.close();
  }

  addIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      console.log(candidate);
      this.peerConnection.addIceCandidate(candidate);
    } catch (err) {
      window.capture.log("error", err.message);
    }
  }
}
