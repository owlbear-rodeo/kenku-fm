package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	discord "github.com/owlbear-rodeo/discordgo"
)

type JoinVoiceChannelPayload struct {
	GuildId   string `json:"guildId"`
	ChannelId string `json:"channelId"`
}

type SignalWebRTCPayload struct {
	Offer string `json:"offer"`
}

var d *Discord
var listeners map[string]chan *discord.RealtimePacket

func start() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		d = Create(token)
		d.Open()
		w.WriteHeader(http.StatusOK)
	}
}

func getInfo() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		info := d.GetInfo()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(info)
	}
}

func closeDiscord() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		d.Close()
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}
}

func join(webrtc *RTC, broadcaster *broadcastServer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		t := &JoinVoiceChannelPayload{}
		err := json.NewDecoder(r.Body).Decode(t)
		if err != nil {
			panic(err)
		}

		v, err := d.JoinVoiceChannel(t.GuildId, t.ChannelId)
		if err != nil {
			fmt.Println("failed to join voice channel:", err)
			w.WriteHeader(http.StatusBadGateway)
		}

		d.voice_connections[t.ChannelId] = v
		l := broadcaster.Subscribe()
		listeners[t.ChannelId] = l

		d.SendAudio(v, l)
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte("ok"))
	}
}

func leave(broadcaster *broadcastServer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		t := &JoinVoiceChannelPayload{}
		err := json.NewDecoder(r.Body).Decode(t)
		if err != nil {
			panic(err)
		}

		d.LeaveVoiceChannel(t.GuildId, t.ChannelId)
		broadcaster.CancelSubscription(listeners[t.ChannelId])

		delete(listeners, t.ChannelId)
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte("ok"))
	}
}

func signal(webrtc *RTC) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		t := &SignalWebRTCPayload{}
		err := json.NewDecoder(r.Body).Decode(t)
		if err != nil {
			panic(err)
		}
		description := webrtc.Signal(t.Offer)
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(description)
	}
}

func stream(webrtc *RTC, c chan *discord.RealtimePacket) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		webrtc.StartStream(c)
		w.WriteHeader(http.StatusAccepted)
	}
}

func main() {
	port := os.Args[1]
	fmt.Printf("Server running on port :%s", port)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	w := CreateNewWebRTC()
	rtpChan := make(chan *discord.RealtimePacket)
	broadcaster := NewBroadcastServer(ctx, rtpChan)

	listeners = make(map[string]chan *discord.RealtimePacket)

	http.HandleFunc("/disgo/discord/start", start())
	http.HandleFunc("/disgo/get-info", getInfo())
	http.HandleFunc("/disgo/close", closeDiscord())
	http.HandleFunc("/disgo/join", join(w, broadcaster))
	http.HandleFunc("/disgo/leave", leave(broadcaster))
	http.HandleFunc("/disgo/webrtc/signal", signal(w))
	http.HandleFunc("/disgo/webrtc/stream", stream(w, rtpChan))

	http.ListenAndServe(":"+port, nil)
}
