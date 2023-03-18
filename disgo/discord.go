package main

import (
	"context"
	"fmt"

	discord "github.com/owlbear-rodeo/discordgo"
)

type Voice struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type Guild struct {
	Id       string  `json:"id"`
	Name     string  `json:"name"`
	Icon     string  `json:"icon"`
	Channels []Voice `json:"voiceChannels"`
}

type Discord struct {
	ctx context.Context
	bot *discord.Session
}

func Create(ctx context.Context, token string) (s Discord) {
	// Create a new Discord session using the provided bot token.
	dg, err := discord.New("Bot " + token)
	if err != nil {
		fmt.Println("error creating Discord session,", err)
		return
	}

	// In this example, we only care about receiving message events.
	dg.Identify.Intents = discord.IntentGuilds | discord.IntentGuildVoiceStates

	if ctx == nil {
		ctx = context.Background()
	}

	return Discord{
		ctx: ctx,
		bot: dg,
	}
}

func (d *Discord) Open() {
	if err := d.bot.Open(); err != nil {
		println(`open connection failed: %v`, err)
	}
}

func (d *Discord) GetInfo() []Guild {
	guilds, _ := d.bot.UserGuilds(0, "", "")

	var guild_slice []Guild

	for _, v := range guilds {
		channels, _ := d.bot.GuildChannels(v.ID)
		var voice_channels []Voice
		for _, v := range channels {
			if v.Type == discord.ChannelTypeGuildVoice {
				channel := Voice{
					Id:   v.ID,
					Name: v.Name,
				}

				voice_channels = append(voice_channels, channel)
			}
		}

		icon, _ := d.bot.GuildPreview(v.ID)

		icon_url := icon.IconURL("")

		guild := Guild{
			Id:       v.ID,
			Name:     v.Name,
			Icon:     icon_url,
			Channels: voice_channels,
		}
		guild_slice = append(guild_slice, guild)
	}

	return guild_slice
}

func (s *Discord) Close() {
	// Cleanly close down the Discord session.
	s.bot.Close()
}

func (s *Discord) JoinVoiceChannel(guildID string, channelID string) (*discord.VoiceConnection, error) {
	channel, err := s.bot.ChannelVoiceJoin(guildID, channelID, false, true)
	if err != nil {
		fmt.Println("failed to join voice channel:", err)
		return nil, err
	}

	return channel, err
}

func (s *Discord) LeaveVoiceChannel(guildID string, channelID string) {
	_, err := s.bot.ChannelVoiceJoin(guildID, "", false, true)
	if err != nil {
		fmt.Println("failed to join voice channel:", err)
		return
	}
}

func (s *Discord) SendAudio(v *discord.VoiceConnection, listener <-chan *discord.RealtimePacket) {
	var err error

	if !v.Ready || v.OpusSend == nil {
		if err != nil {
			fmt.Printf("Discordgo not to receive opus packets. %+v : %+v", v.Ready, v.OpusSend)
		}
		return
	}

	for {
		payload := <-listener
		v.OpusSend <- *payload
	}
}
