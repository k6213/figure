/**
 * useChat.js
 * Socket.IO connection lifecycle management hook
 *
 * - Connect socket on component mount, disconnect on unmount
 * - Reconnect when auth token changes (login/logout)
 * - Pass authenticated nickname to server via auth; server assigns anonymous number if absent
 * - Returns sendMessage(text) → called from ChatBox
 */
import { useEffect, useRef, useCallback } from 'react'
import { io }            from 'socket.io-client'
import { useChatStore }  from '../store/chatStore'
import { useAuthStore }  from '../store/authStore'

export function useChat() {
  const socketRef = useRef(null)

  // Zustand actions have stable references (unaffected by re-renders)
  const {
    addMessage,
    setHistory,
    setNickname,
    setConnected,
    setOnlineUsers,
  } = useChatStore.getState()

  const { user, token, isAuthenticated } = useAuthStore()

  /** Authenticated nickname → email prefix → empty string (server assigns anonymous) */
  const resolveNick = useCallback(() => {
    if (user?.nickname) return user.nickname
    if (user?.email)    return user.email.split('@')[0]
    return ''
  }, [user])

  useEffect(() => {
    // Don't connect until the user is authenticated (avoids 403 spam when not logged in)
    if (!isAuthenticated) return

    const nickname = resolveNick()

    // ── Socket creation ─────────────────────────────────────────────────────────
    // Vite proxy allows connecting to the same origin (/)
    const socket = io('/', {
      path:                '/socket.io/',
      auth:                { token: token ?? undefined, nickname: nickname || undefined },
      transports:          ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay:    1500,
    })
    socketRef.current = socket

    // ── Event handlers ────────────────────────────────────────────────────
    socket.on('connect', () => {
      setConnected(true)
      // Confirm nickname on successful connection (assuming server accepted it after dedup)
      if (nickname) setNickname(nickname)
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('connect_error', (err) => {
      console.warn('[chat] connect_error:', err.message)
    })

    // Receive history immediately after connecting (once)
    socket.on('chat:history', (msgs) => {
      setHistory(msgs)
      // After receiving history, any server-assigned nickname can be identified from first system message
      // Here we use the resolveNick result as-is
      if (!nickname) {
        // Server assigned an anonymous nickname — could parse from last system message
        // (optional implementation — currently skipped, displayed as anonymous)
      }
    })

    // Receive real-time messages
    socket.on('chat:message', (msg) => {
      const myNick = useChatStore.getState().nickname
      const isMine = msg.type === 'user' && msg.nickname === myNick
      addMessage(msg, isMine)
    })

    // Update online user count
    socket.on('chat:users', (n) => setOnlineUsers(n))

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [isAuthenticated, token]) // eslint-disable-line react-hooks/exhaustive-deps
  // Reconnect when auth state changes (login/logout)

  /** Send message — called from ChatBox */
  const sendMessage = useCallback((text) => {
    if (!text?.trim()) return
    socketRef.current?.emit('chat:send', { text: text.trim() })
  }, [])

  return { sendMessage }
}
