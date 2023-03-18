package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	discord "github.com/owlbear-rodeo/discordgo"
)

type JoinVoiceChannelPayload struct {
	GuildId   string `json:"guildId"`
	ChannelId string `json:"channelId"`
}

type SignalWebRTCPayload struct {
	Offer string `json:"offer"`
}

func start(discord *Discord) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		*discord = Create(context.Background(), token)
		w.WriteHeader(http.StatusOK)
	}
}

func getInfo(discord *Discord) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		info := discord.GetInfo()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(info)
	}
}

func closeDiscord(discord *Discord) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		discord.Close()
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}
}

func join(webrtc *RTC, discord *Discord, broadcaster *broadcastServer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		t := &JoinVoiceChannelPayload{}
		err := json.NewDecoder(r.Body).Decode(t)
		if err != nil {
			panic(err)
		}

		discord.Open()
		v, err := discord.JoinVoiceChannel(t.GuildId, t.ChannelId)
		if err != nil {
			fmt.Println("failed to join voice channel:", err)
			w.WriteHeader(http.StatusBadGateway)
		}

		l := broadcaster.Subscribe()
		discord.SendAudio(v, l)
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte("ok"))
	}
}

func leave(discord *Discord) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		t := &JoinVoiceChannelPayload{}
		err := json.NewDecoder(r.Body).Decode(t)
		if err != nil {
			panic(err)
		}

		discord.LeaveVoiceChannel(t.GuildId, t.ChannelId)
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
	addr := ":8091"

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	d := Discord{}
	w := CreateNewWebRTC()
	rtpChan := make(chan *discord.RealtimePacket)
	broadcaster := NewBroadcastServer(ctx, rtpChan)

	http.HandleFunc("/disgo/discord/start", start(&d))
	http.HandleFunc("/disgo/get-info", getInfo(&d))
	http.HandleFunc("/disgo/close", closeDiscord(&d))
	http.HandleFunc("/disgo/join", join(w, &d, broadcaster))
	http.HandleFunc("/disgo/leave", leave(&d))
	http.HandleFunc("/disgo/webrtc/signal", signal(w))
	http.HandleFunc("/disgo/webrtc/stream", stream(w, rtpChan))

	fmt.Printf("Server running on port %s", addr)
	http.ListenAndServe(addr, nil)
}
