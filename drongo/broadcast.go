package main

import (
	"context"
)

type BroadcastServer interface {
	Subscribe() <-chan []byte
	CancelSubscription(<-chan []byte)
}

type broadcastServer struct {
	source         <-chan *[]byte
	listeners      []chan *[]byte
	addListener    chan chan *[]byte
	removeListener chan (<-chan *[]byte)
}

func (s *broadcastServer) Subscribe() <-chan *[]byte {
	newListener := make(chan *[]byte)
	s.addListener <- newListener
	return newListener
}

func (s *broadcastServer) CancelSubscription(channel <-chan *[]byte) {
	s.removeListener <- channel
}

func NewBroadcastServer(ctx context.Context, source <-chan *[]byte) *broadcastServer {
	service := &broadcastServer{
		source:         source,
		listeners:      make([]chan *[]byte, 0),
		addListener:    make(chan chan *[]byte),
		removeListener: make(chan (<-chan *[]byte)),
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
		case listenerToRemove := <-s.removeListener:
			for i, ch := range s.listeners {
				if ch == listenerToRemove {
					s.listeners[i] = s.listeners[len(s.listeners)-1]
					s.listeners = s.listeners[:len(s.listeners)-1]
					close(ch)
					break
				}
			}
		case val, ok := <-s.source:
			if !ok {
				return
			}
			for _, listener := range s.listeners {
				if listener != nil {
					select {
					case listener <- val:
					case <-ctx.Done():
						return
					}

				}
			}
		}
	}
}
