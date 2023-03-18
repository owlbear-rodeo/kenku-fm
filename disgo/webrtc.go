package main

import (
	"encoding/json"
	"fmt"

	"github.com/pion/interceptor"
	"github.com/pion/webrtc/v3"

	discord "github.com/owlbear-rodeo/discordgo"
)

type RTC struct {
	connection *webrtc.PeerConnection
}

func CreateNewWebRTC() *RTC {
	// Create a MediaEngine object to configure the supported codec
	m := &webrtc.MediaEngine{}

	// Setup the codecs you want to use.
	if err := m.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType:     webrtc.MimeTypeOpus,
			ClockRate:    48000,
			Channels:     2,
			SDPFmtpLine:  "",
			RTCPFeedback: nil,
		},
		PayloadType: 111,
	}, webrtc.RTPCodecTypeAudio); err != nil {
		panic(err)
	}

	// Create a InterceptorRegistry. This is the user configurable RTP/RTCP Pipeline.
	// This provides NACKs, RTCP Reports and other features. If you use `webrtc.NewPeerConnection`
	// this is enabled by default. If you are manually managing You MUST create a InterceptorRegistry
	// for each PeerConnection.
	i := &interceptor.Registry{}

	// Use the default set of Interceptors
	if err := webrtc.RegisterDefaultInterceptors(m, i); err != nil {
		panic(err)
	}

	// Create the API object with the MediaEngine
	api := webrtc.NewAPI(webrtc.WithMediaEngine(m), webrtc.WithInterceptorRegistry(i))

	// Prepare the configuration
	config := webrtc.Configuration{}
	// Create a new RTCPeerConnection
	peerConnection, err := api.NewPeerConnection(config)
	if err != nil {
		panic(err)
	}

	return &RTC{
		connection: peerConnection,
	}
}

func (p *RTC) Signal(offer string) webrtc.SessionDescription {
	// Set the remote SessionDescription
	obj := webrtc.SessionDescription{}
	err := json.Unmarshal([]byte(offer), &obj)
	if err != nil {
		panic(err)
	}
	err = p.connection.SetRemoteDescription(obj)
	if err != nil {
		panic(err)
	}

	// Create an answer
	answer, err := p.connection.CreateAnswer(nil)
	if err != nil {
		panic(err)
	}

	// Create channel that is blocked until ICE Gathering is complete
	gatherComplete := webrtc.GatheringCompletePromise(p.connection)

	// Sets the LocalDescription, and starts our UDP listeners
	if err = p.connection.SetLocalDescription(answer); err != nil {
		panic(err)
	}

	// Block until ICE Gathering is complete, disabling trickle ICE
	// we do this because we only can exchange one signaling message
	// in a production application you should exchange ICE Candidates via OnICECandidate
	<-gatherComplete

	local_description := *p.connection.LocalDescription()

	return local_description
}

func (p *RTC) StartStream(c chan *discord.RealtimePacket) {
	// Set a handler for when a new remote track starts, this handler copies inbound RTP packets,
	// replaces the SSRC and sends them back
	p.connection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		fmt.Printf("Track has started, of type %d: %s \n", track.PayloadType(), track.Codec().MimeType)

		var sequenceNumber uint16
		go func() {
			for {
				// Read RTP packets being sent to Pion
				packet, _, readErr := track.ReadRTP()
				if readErr != nil {
					panic(readErr)
				}

				if len(packet.Payload) > 0 {
					realtimePacket := discord.RealtimePacket{
						Payload:        packet.Payload,
						SequenceNumber: sequenceNumber,
						Timestamp:      packet.Timestamp,
					}
					c <- &realtimePacket
					sequenceNumber++
				}
			}
		}()
	})

	// Set the handler for Peer connection state
	// This will notify you when the peer has connected/disconnected
	p.connection.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
		fmt.Printf("Peer Connection State has changed: %s\n", s.String())
		if s == webrtc.PeerConnectionStateConnected {
			fmt.Println("Peer Connection is connected")
		}
		if s == webrtc.PeerConnectionStateFailed {
			fmt.Println("Peer Connection has gone to failed exiting")
		}
	})
}
