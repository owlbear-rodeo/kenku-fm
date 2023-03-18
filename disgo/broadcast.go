package main

import (
	"context"

	discord "github.com/owlbear-rodeo/discordgo"
)

type BroadcastServer interface {
	Subscribe() <-chan discord.RealtimePacket
	CancelSubscription(<-chan discord.RealtimePacket)
}

type broadcastServer struct {
	source         <-chan *discord.RealtimePacket
	listeners      []chan *discord.RealtimePacket
	addListener    chan chan *discord.RealtimePacket
	removeListener chan (<-chan *discord.RealtimePacket)
}

func (s *broadcastServer) Subscribe() chan *discord.RealtimePacket {
	newListener := make(chan *discord.RealtimePacket)
	s.addListener <- newListener
	return newListener
}

func (s *broadcastServer) CancelSubscription(channel chan *discord.RealtimePacket) {
	for i, ch := range s.listeners {
		if ch == channel {
			s.listeners[i] = s.listeners[len(s.listeners)-1]
			s.listeners = s.listeners[:len(s.listeners)-1]
			close(ch)
			break
		}
	}
}

func NewBroadcastServer(ctx context.Context, source <-chan *discord.RealtimePacket) *broadcastServer {
	service := &broadcastServer{
		source:         source,
		listeners:      make([]chan *discord.RealtimePacket, 0),
		addListener:    make(chan chan *discord.RealtimePacket),
		removeListener: make(chan (<-chan *discord.RealtimePacket)),
	}
	go service.serve(ctx)
	return service
}

func (s *broadcastServer) serve(ctx context.Context) {
	defer func() {
		for _, listener := range s.listeners {
			if listener != nil {
				close(listener)
			}
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return
		case newListener := <-s.addListener:
			s.listeners = append(s.listeners, newListener)
		case val, ok := <-s.source:
			if !ok {
				return
			}
			for _, listener := range s.listeners {
				if listener != nil {
					select {
					case <-ctx.Done():
						return
					default:
						SafeSend(listener, val)
					}
				}
			}
		}
	}
}

func SafeSend(ch chan *discord.RealtimePacket, value *discord.RealtimePacket) (closed bool) {
	defer func() {
		if recover() != nil {
			closed = true
		}
	}()

	ch <- value  // panic if ch is closed
	return false // <=> closed = false; return
}
