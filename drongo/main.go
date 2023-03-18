package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type JoinVoiceChannelPayload struct {
	GuildId   string `json:"guildId"`
	ChannelId string `json:"channelId"`
}

type SignalWebRTCPayload struct {
	Offer string `json:"offer"`
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

func stream(webrtc *RTC, c chan *[]byte) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		webrtc.StartStream(c)
		w.WriteHeader(http.StatusAccepted)
	}
}

func main() {
	fmt.Println("Server running on port 8091")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	c := Create(nil)
	w := CreateNewWebRTC()

	rtpChan := make(chan *[]byte)
	broadcaster := NewBroadcastServer(ctx, rtpChan)

	http.HandleFunc("/drongo/get-info", getInfo(c))
	http.HandleFunc("/drongo/close", closeDiscord(c))
	http.HandleFunc("/drongo/join", join(w, c, broadcaster))
	http.HandleFunc("/drongo/leave", leave(c))
	http.HandleFunc("/drongo/webrtc/signal", signal(w))
	http.HandleFunc("/drongo/webrtc/stream", stream(w, rtpChan))

	http.ListenAndServe(":8091", nil)
}
