import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Room } from '@colyseus/sdk';

type ChatMessage = { nickname: string; text: string; at: number };
type Props = { room: Room; messageType: string; nickname: string };

export function ChatPanel({ room, messageType, nickname }: Props): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    return room.onMessage<ChatMessage>(messageType, message => {
      if (typeof message?.nickname !== 'string' || typeof message?.text !== 'string') return;
      setMessages(current => [...current.slice(-49), message]);
    });
  }, [room, messageType]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages]);

  function send(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    room.send(messageType, text);
    setDraft('');
  }

  return <section className="chat-panel" aria-label="방 채팅">
    <div className="chat-heading"><strong>채팅</strong><small>같은 방의 플레이어에게 전송</small></div>
    <div className="chat-messages" aria-live="polite">{messages.length === 0 ? <p className="chat-empty">첫 메시지를 보내 보세요.</p> : messages.map((message, index) => <div className={`chat-message ${message.nickname === nickname ? 'mine' : ''}`} key={`${message.at}-${index}`}><strong>{message.nickname}</strong><span>{message.text}</span></div>)}<div ref={end} /></div>
    <form className="chat-form" onSubmit={send}><input aria-label="채팅 메시지" value={draft} onChange={event => setDraft(event.target.value)} maxLength={200} placeholder="메시지 입력" /><button type="submit" disabled={!draft.trim()}>전송</button></form>
  </section>;
}
