import { TypedEmitter } from "tiny-typed-emitter";

export interface RTCConnectionEvents {
  connect: (connection: RTCConnection) => void;
}

/**
 * A single WebRTC connection to the severus backed
 */
export class RTCConnection extends TypedEmitter<RTCConnectionEvents> {
  private peerConnection: RTCPeerConnection;
  /** Has this connection been manually closed. Used to determine whether it should be restarted */
  closed = false;

  async start(stream: MediaStream): Promise<void> {
    try {
      await window.capture.rtcCreateConnection();

      this.peerConnection = new RTCPeerConnection();

      stream
        .getTracks()
        .forEach((track) => this.peerConnection.addTrack(track, stream));

      let makingOffer = true;
      let bufferedCandidates: RTCIceCandidate[] = [];
      this.peerConnection.onnegotiationneeded = async () => {
        try {
          window.capture.log("debug", "renderer rtc stream negotiating");
          const offer = await this.peerConnection.createOffer();
          offer.sdp = offer.sdp
            .replace(
              "minptime=10;useinbandfec=1",
              // Increase bitrate and enable stereo
              "minptime=10; useinbandfec=1; maxaveragebitrate=128000; stereo=1; sprop-stereo=1"
            )
            .replace(
              // Add preferred packetization time for Opus
              /(a=rtpmap:\d+ opus\/48000\/2.*\r?\n)/,
              `$1a=ptime:20\r\na=maxptime:60\r\n`
            );
          await this.peerConnection.setLocalDescription(offer);
          const answer = await window.capture.rtcSignal(
            JSON.stringify(this.peerConnection.localDescription)
          );
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(answer))
          );
          makingOffer = false;
          for (const candidate of bufferedCandidates) {
            await window.capture.rtcAddCandidate(JSON.stringify(candidate));
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
    window.capture.log("debug", `renderer peer connection closed`);
  }

  addIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      this.peerConnection.addIceCandidate(candidate);
    } catch (err) {
      window.capture.log("error", err.message);
    }
  }
}
