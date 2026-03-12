import { useState } from 'react'

function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Hi, how can I help you today?' },
  ])

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text) {
      return
    }

    setMessages((prev) => ([
      ...prev,
      { id: Date.now(), type: 'user', text },
      { id: Date.now() + 1, type: 'bot', text: 'Thanks. Our team will assist you shortly.' },
    ]))
    setInput('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    handleSend()
  }

  return (
    <div className="floating-chat-root">
      {isOpen && (
        <section className="floating-chat-panel" aria-label="Support chat">
          <div className="floating-chat-header">
            <h3>Chat Support</h3>
            <button type="button" className="floating-chat-close" onClick={handleToggle} aria-label="Close chat">
              x
            </button>
          </div>

          <div className="floating-chat-messages">
            {messages.map((message) => (
              <p
                key={message.id}
                className={`floating-chat-message ${message.type === 'user' ? 'floating-chat-user' : 'floating-chat-bot'}`}
              >
                {message.text}
              </p>
            ))}
          </div>

          <form className="floating-chat-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="floating-chat-input"
              placeholder="Type a message..."
            />
            <button type="submit" className="floating-chat-send">Send</button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="floating-chat-fab"
        onClick={handleToggle}
        aria-label={isOpen ? 'Close chat box' : 'Open chat box'}
      >
        {isOpen ? 'Close' : 'Chat'}
      </button>
    </div>
  )
}

export default FloatingChat
