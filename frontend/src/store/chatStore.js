/**
 * chatStore.js
 * Real-time chat global state (Zustand)
 *
 * latestBubble
 *   Extension point for 3D scene avatar speech bubbles.
 *   When a user message arrives, it is held as { nickname, text, isMine } for 3.2 seconds;
 *   CharacterMesh in CityScene.jsx subscribes to this value to display Html speech bubbles.
 */
import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────────
  messages:     [],     // { id, nickname, text, timestamp, type, isMine }[]
  isOpen:       false,
  unreadCount:  0,
  nickname:     '',     // my nickname confirmed by server
  onlineUsers:  0,
  isConnected:  false,

  // 3D speech bubble — set briefly when a user message arrives, auto-cleared after 3.2s
  latestBubble: null,   // { nickname: str, text: str, isMine: bool } | null
  _bubbleTimer: null,   // internal timer id for clearTimeout

  // ── Add message ──────────────────────────────────────────────────────────
  addMessage(msg, isMine = false) {
    const enriched = { ...msg, isMine }

    set(s => ({
      messages: [...s.messages.slice(-199), enriched],
      // Increment badge only when panel is closed and it's a user message
      unreadCount:
        !s.isOpen && msg.type === 'user' ? s.unreadCount + 1 : s.unreadCount,
    }))

    // 3D speech bubble — user messages only
    if (msg.type === 'user') {
      const prev = get()._bubbleTimer
      if (prev) clearTimeout(prev)

      const timer = setTimeout(
        () => set({ latestBubble: null, _bubbleTimer: null }),
        3200,
      )
      set({
        latestBubble: { nickname: msg.nickname, text: msg.text, isMine },
        _bubbleTimer: timer,
      })
    }
  },

  // ── Bulk load history (received from server on connect) ──────────────────────────
  setHistory(msgs) {
    set({ messages: msgs.map(m => ({ ...m, isMine: false })) })
  },

  // ── Panel toggle ────────────────────────────────────────────────────────────
  toggleOpen() {
    set(s => ({ isOpen: !s.isOpen, unreadCount: 0 }))
  },
  open()  { set({ isOpen: true,  unreadCount: 0 }) },
  close() { set({ isOpen: false }) },

  // ── Other setters ──────────────────────────────────────────────────────────
  setNickname(nick)  { set({ nickname: nick }) },
  setConnected(v)    { set({ isConnected: v }) },
  setOnlineUsers(n)  { set({ onlineUsers: n }) },
}))
