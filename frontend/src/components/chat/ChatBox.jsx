/**
 * ChatBox.jsx
 * Real-time chat UI — overlay above 3D scene (React Portal)
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'

// ── SVG icons (1.5px stroke) ──────────────────────────────────────────────────
function IconChat({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}
function IconX({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
function IconSend({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}
function IconUsers({ className = 'w-3 h-3' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

// ── Timestamp formatter ───────────────────────────────────────────────────────
function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

// ── System message ────────────────────────────────────────────────────────────
function SystemMessage({ msg }) {
  return (
    <div className="flex justify-center my-2">
      <span className="text-[10px] text-zinc-600 bg-white/[0.04] rounded-full px-3 py-0.5 leading-relaxed">
        {msg.text}
      </span>
    </div>
  )
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  if (msg.isMine) {
    return (
      <div className="flex flex-col items-end gap-1 mb-3">
        <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-br-sm
                        bg-cyan-500/[0.16] border border-cyan-500/[0.24]">
          <p className="text-[11.5px] text-zinc-100 break-words leading-relaxed">{msg.text}</p>
        </div>
        <span className="text-[9px] text-zinc-700 mr-0.5 tabular-nums">{fmtTime(msg.timestamp)}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-start gap-1 mb-3">
      <span className="text-[9px] text-cyan-400/60 font-semibold ml-1 truncate max-w-[85%] tracking-wide">
        {msg.nickname}
      </span>
      <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm
                      bg-white/[0.06] border border-white/[0.09]">
        <p className="text-[11.5px] text-zinc-200 break-words leading-relaxed">{msg.text}</p>
      </div>
      <span className="text-[9px] text-zinc-700 ml-1 tabular-nums">{fmtTime(msg.timestamp)}</span>
    </div>
  )
}

// ── Scrollbar utility class ───────────────────────────────────────────────────
const SLIM_SCROLL = [
  '[&::-webkit-scrollbar]:w-[3px]',
  '[&::-webkit-scrollbar-track]:bg-transparent',
  '[&::-webkit-scrollbar-thumb]:bg-white/[0.08]',
  '[&::-webkit-scrollbar-thumb]:rounded-full',
  '[&::-webkit-scrollbar-thumb:hover]:bg-white/[0.16]',
].join(' ')

// ── Inner implementation ──────────────────────────────────────────────────────
function ChatBoxInner({ sendMessage }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const listRef   = useRef(null)

  const {
    messages, isOpen, unreadCount,
    nickname, onlineUsers, isConnected,
    toggleOpen,
  } = useChatStore()

  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const el = listRef.current
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => {
      inputRef.current?.focus()
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }, 180)
  }, [isOpen])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text) return
    if (isConnected) {
      sendMessage(text)
    } else {
      // local-only: add to store directly so the user can still see their messages
      const { addMessage, nickname } = useChatStore.getState()
      addMessage({
        id:        `local-${Date.now()}`,
        type:      'user',
        nickname:  nickname || 'Me',
        text,
        timestamp: new Date().toISOString(),
      }, true)
    }
    setInput('')
  }, [input, isConnected, sendMessage])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col items-start select-none">

      {/* ── Expanded panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: 8,   scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="w-[320px] mb-3 flex flex-col rounded-2xl overflow-hidden
                       bg-[#0d0d12]/[0.97] backdrop-blur-xl
                       border border-white/[0.12]
                       shadow-2xl shadow-black/80"
            style={{ height: 440 }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between
                            px-4 py-3 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Live status dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${
                  isConnected
                    ? 'bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.7)]'
                    : 'bg-zinc-600 animate-pulse'
                }`} />
                <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Chat</span>
                {onlineUsers > 0 && (
                  <div className="flex items-center gap-1 text-zinc-600">
                    <IconUsers />
                    <span className="text-[9px] font-mono tabular-nums">{onlineUsers}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 min-w-0">
                {nickname && (
                  <span className="text-[9px] font-medium text-zinc-500
                                   bg-white/[0.05] border border-white/[0.07]
                                   px-2 py-0.5 rounded-full truncate max-w-[80px]">
                    {nickname}
                  </span>
                )}
                <button
                  onClick={toggleOpen}
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0
                             text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.08]
                             transition-all duration-150"
                >
                  <IconX />
                </button>
              </div>
            </div>

            {/* ── Message list ── */}
            <div
              ref={listRef}
              className={`flex-1 overflow-y-auto px-3.5 py-3.5 ${SLIM_SCROLL}`}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.07]
                                  flex items-center justify-center text-zinc-600">
                    <IconChat className="w-5 h-5" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[11px] font-medium text-zinc-500">No messages yet</p>
                    <p className="text-[10px] text-zinc-700">Be the first to say hello</p>
                  </div>
                </div>
              ) : (
                messages.map(msg =>
                  msg.type === 'system'
                    ? <SystemMessage key={msg.id} msg={msg} />
                    : <MessageBubble key={msg.id} msg={msg} />,
                )
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Input ── */}
            <div className="shrink-0 px-3.5 pb-3.5 pt-2.5 border-t border-white/[0.06]">
              <div className="flex items-center gap-2.5
                              bg-white/[0.04] border border-white/[0.09] rounded-xl
                              px-3.5 py-2.5
                              focus-within:border-cyan-500/35 focus-within:bg-white/[0.06]
                              transition-all duration-200">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  maxLength={300}
                  placeholder={isConnected ? 'Type a message…' : 'Type a message… (offline)'}
                  disabled={false}
                  className="flex-1 bg-transparent text-[11.5px] text-zinc-200
                             placeholder:text-zinc-700 outline-none min-w-0
                             disabled:opacity-30"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                             text-cyan-500 hover:text-cyan-300 hover:bg-cyan-500/[0.12]
                             disabled:text-zinc-700 disabled:hover:bg-transparent
                             transition-all duration-150"
                  title="Send (Enter)"
                >
                  <IconSend className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-0.5">
                <span className="text-[9px] text-zinc-800">
                  {isConnected ? '' : 'Connecting to server…'}
                </span>
                <kbd className="text-[9px] text-zinc-800 font-mono
                                 px-1.5 py-0.5 rounded-md
                                 border border-white/[0.06] bg-white/[0.03]">
                  Enter ↵
                </kbd>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle FAB ─────────────────────────────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={toggleOpen}
        title="Chat"
        className={`relative w-11 h-11 rounded-2xl
                    flex items-center justify-center
                    backdrop-blur-xl border shadow-xl
                    transition-all duration-200
                    ${isOpen
                      ? 'bg-cyan-500/[0.18] border-cyan-500/35 text-cyan-300'
                      : 'bg-[#0d0d12]/[0.97] border-white/[0.12] text-zinc-300 hover:text-white hover:border-white/[0.22]'}`}
      >
        <IconChat className="w-4.5 h-4.5" />

        {/* Unread badge */}
        <AnimatePresence>
          {!isOpen && unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{   scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="absolute -top-1.5 -right-1.5
                         min-w-[18px] h-[18px] px-1 rounded-full
                         bg-rose-500 text-white text-[9px] font-bold
                         flex items-center justify-center
                         shadow-[0_0_10px_rgba(244,63,94,0.6)]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}

// ── Portal wrapper ────────────────────────────────────────────────────────────
export default function ChatBox({ sendMessage }) {
  return createPortal(
    <ChatBoxInner sendMessage={sendMessage} />,
    document.body,
  )
}
