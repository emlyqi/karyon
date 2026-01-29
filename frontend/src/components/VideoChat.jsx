import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.min.css'

export default function VideoChat({ video, onBack, initialMessages = [], onMessagesChange }) {
  const [messages, setMessages] = useState(initialMessages)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [emptyPrompt] = useState(() => {
    const prompts = [
      "What do you wanna know today?",
      "Curiosity is the wick in the candle of learning.",
      "The only dumb question is the one you don't ask.",
      "Dig in, ask away.",
      "What caught your eye?",
      "Learn something new today.",
      "Go ahead, pick my brain.",
      "Questions are the keys to understanding.",
      "What's on your mind?",
    ]
    return prompts[Math.floor(Math.random() * prompts.length)]
  })
  const playerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!video) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-sm text-gray-500">Loading video...</div>
      </div>
    );
  }

  // Save messages whenever they change
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages)
    }
  }, [messages, onMessagesChange])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim() || loading) return

    const userMessage = { role: 'user', content: question }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setQuestion('')
    setLoading(true)

    try {
      const response = await axios.post(`/api/videos/${video.id}/ask/`, {
        question: question.trim(),
        conversation_history: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      })

      const { answer, confidence, timestamp, segment_text, has_answer } = response.data

      const assistantMessage = {
        role: 'assistant',
        content: answer,
        confidence,
        timestamp,
        segment_text,
        has_answer
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Query failed:', error, error.response?.data)
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        confidence: 'low'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const seekToTimestamp = (timestamp) => {
    if (playerRef.current) {
      playerRef.current.currentTime = timestamp
      playerRef.current.play()
    }
  }

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getConfidenceBadge = (confidence) => {
    const styles = {
      high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      low: 'bg-red-50 text-red-700 border-red-200'
    }

    return (
      <span className={`px-2 py-0.5 text-xs border ${styles[confidence] || styles.medium}`}>
        confidence: {confidence}
      </span>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Video Player */}
      <div className="bg-white border border-gray-200 p-6 shadow-boxy">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h2 className="text-sm text-slate-800 font-medium truncate">{video.title}</h2>
            <div className="flex items-center gap-1.5 shrink-0">
              {video.youtube_url && (
                <a
                  href={video.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 transition-colors"
                  title="Watch on YouTube"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              )}
              {(video.processing_mode === 'audio' || video.processing_mode === 'both' || !video.processing_mode) && (
                <span title="Audio analysis available">
                  <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </span>
              )}
              {(video.processing_mode === 'visual' || video.processing_mode === 'both' || !video.processing_mode) && (
                <span title="Visual analysis available">
                  <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-600 shrink-0 ml-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="aspect-video bg-gray-900 overflow-hidden border border-gray-200 shadow-boxy">
          <video
            ref={playerRef}
            src={video.file}
            controls
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white border border-gray-200 p-6 flex flex-col h-[calc(100vh-12rem)] shadow-boxy">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h3 className="text-base font-medium text-slate-800 font-mono-brand tracking-wider uppercase">Ask</h3>
          {messages.length > 0 && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 shadow-boxy py-1 z-10">
                  <button
                    onClick={() => {
                      if (confirm('Clear chat history?')) {
                        setMessages([])
                      }
                      setMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                  >
                    Clear chat history
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-12 space-y-3 animate-fade-in">
              <div className="text-2xl animate-float">?</div>
              <p className="text-sm">{emptyPrompt}</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-50 text-gray-900 border border-gray-200'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            className="text-xs"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-gray-800 text-orange-400 px-1 py-0.5 text-xs font-mono-brand" {...props}>
                            {children}
                          </code>
                        )
                      },
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="ml-2">{children}</li>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}

                {msg.role === 'assistant' && msg.timestamp !== undefined && msg.has_answer !== false && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      {getConfidenceBadge(msg.confidence)}
                      <button
                        onClick={() => seekToTimestamp(msg.timestamp)}
                        className="text-xs text-orange-600 hover:text-orange-800 flex items-center font-mono-brand"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                        {formatTimestamp(msg.timestamp)}
                      </button>
                    </div>

                    {msg.segment_text && (
                      <div className="text-xs text-gray-500 italic">
                        "{msg.segment_text}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-200 px-4 py-3">
                <div className="flex space-x-1.5">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-orange-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-4 py-2 bg-orange-600 text-white disabled:opacity-50 disabled:hover:bg-orange-600 disabled:hover:shadow-none enabled:hover:bg-orange-700 text-sm font-mono-brand tracking-wide transition-all enabled:hover:shadow-boxy-orange"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
