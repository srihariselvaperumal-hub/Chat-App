import { useEffect, useRef, useState } from "react";
import "./App.css";

const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

function App() {
  // Normal chat conversations
  const [chats, setChats] = useState([
    {
      id: 1,
      title: "Hello Sri",
      messages: [
        {
          text: "Hello Sri",
          sender: "user",
        },
        {
          text: "Hello! How can I help you?",
          sender: "assistant",
        },
      ],
    },
    {
      id: 2,
      title: "Python Learning",
      messages: [
        {
          text: "Python Learning",
          sender: "user",
        },
        {
          text: "Sure! I can help you learn Python.",
          sender: "assistant",
        },
      ],
    },
  ]);

  // Currently selected chat
  const [activeChatId, setActiveChatId] = useState(null);

  // Message being typed
  const [message, setMessage] = useState("");

  // Temporary chat mode
  const [temporaryChat, setTemporaryChat] = useState(false);

  // Temporary chat messages
  const [temporaryMessages, setTemporaryMessages] = useState([]);

  // AI loading state
  const [isTyping, setIsTyping] = useState(false);

  // Reference for automatic scrolling
  const messagesEndRef = useRef(null);

  // Automatically scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chats, temporaryMessages, isTyping]);

  // Send message to Sri
  async function sendMessage() {
    const text = message.trim();

    if (text === "" || isTyping) {
      return;
    }

    // ========================================================
    // TEMPORARY CHAT
    // ========================================================

    if (temporaryChat) {
      setTemporaryMessages((oldMessages) => [
        ...oldMessages,
        {
          text: text,
          sender: "user",
        },
      ]);

      setMessage("");
      setIsTyping(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: text,
            }),
          }
        );

        const data = await response.json();

        setTemporaryMessages((oldMessages) => [
          ...oldMessages,
          {
            text: data.response,
            sender: "assistant",
          },
        ]);
      } catch (error) {
        setTemporaryMessages((oldMessages) => [
          ...oldMessages,
          {
            text: "Could not connect to Sri AI backend.",
            sender: "assistant",
          },
        ]);
      } finally {
        setIsTyping(false);
      }

      return;
    }

    // ========================================================
    // NEW NORMAL CHAT
    // ========================================================

    if (activeChatId === null) {
      const newChat = {
        id: Date.now(),
        title: text,
        messages: [
          {
            text: text,
            sender: "user",
          },
        ],
      };

      setChats((oldChats) => [
        ...oldChats,
        newChat,
      ]);

      setActiveChatId(newChat.id);
      setMessage("");
      setIsTyping(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: text,
            }),
          }
        );

        const data = await response.json();

        setChats((oldChats) =>
          oldChats.map((chat) => {
            if (chat.id === newChat.id) {
              return {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    text: data.response,
                    sender: "assistant",
                  },
                ],
              };
            }

            return chat;
          })
        );
      } catch (error) {
        setChats((oldChats) =>
          oldChats.map((chat) => {
            if (chat.id === newChat.id) {
              return {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    text: "Could not connect to Sri AI backend.",
                    sender: "assistant",
                  },
                ],
              };
            }

            return chat;
          })
        );
      } finally {
        setIsTyping(false);
      }

      return;
    }

    // ========================================================
    // EXISTING NORMAL CHAT
    // ========================================================

    setChats((oldChats) =>
      oldChats.map((chat) => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: [
              ...chat.messages,
              {
                text: text,
                sender: "user",
              },
            ],
          };
        }

        return chat;
      })
    );

    setMessage("");
    setIsTyping(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
          }),
        }
      );

      const data = await response.json();

      setChats((oldChats) =>
        oldChats.map((chat) => {
          if (chat.id === activeChatId) {
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  text: data.response,
                  sender: "assistant",
                },
              ],
            };
          }

          return chat;
        })
      );
    } catch (error) {
      setChats((oldChats) =>
        oldChats.map((chat) => {
          if (chat.id === activeChatId) {
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  text: "Could not connect to Sri AI backend.",
                  sender: "assistant",
                },
              ],
            };
          }

          return chat;
        })
      );
    } finally {
      setIsTyping(false);
    }
  }

  // Enter key
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  // Create new chat
  function newChat() {
    setActiveChatId(null);
    setMessage("");
    setTemporaryChat(false);
    setTemporaryMessages([]);
    setIsTyping(false);
  }

  // Open existing chat
  function openChat(chatId) {
    setTemporaryChat(false);
    setTemporaryMessages([]);
    setActiveChatId(chatId);
    setMessage("");
    setIsTyping(false);
  }

  // Toggle temporary chat
  function toggleTemporaryChat() {
    const newMode = !temporaryChat;

    setTemporaryChat(newMode);

    if (!newMode) {
      setTemporaryMessages([]);
    }

    if (newMode) {
      setActiveChatId(null);
    }
  }

  // Find active normal chat
  const activeChat = chats.find(
    (chat) => chat.id === activeChatId
  );

  return (
    <div id="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo">
          <span>💙</span>
          <h2>Sri</h2>
        </div>

        <button
          className="new-chat-btn"
          onClick={newChat}
        >
          <span>＋</span>
          New Chat
        </button>

        <div className="history">

          <p>Today</p>

          {chats.map((chat) => (
            <div
              className={
                chat.id === activeChatId
                  ? "chat-item active-chat"
                  : "chat-item"
              }
              key={chat.id}
              onClick={() => openChat(chat.id)}
            >
              <span className="chat-icon">💬</span>
              <span className="chat-title">
                {chat.title}
              </span>
            </div>
          ))}

        </div>

      </aside>


      {/* MAIN CHAT */}

      <main className="chat-area">

        {/* HEADER */}

        <header className="chat-header">

          <div className="header-title">

            <div className="header-logo">
              💙
            </div>

            <div>
              <h1>
                {temporaryChat
                  ? "Temporary Chat"
                  : "Sri"}
              </h1>

              <span className="status">
                <span className="status-dot"></span>
                Online
              </span>
            </div>

          </div>

          <button
            className={
              temporaryChat
                ? "temporary-chat-btn active"
                : "temporary-chat-btn"
            }
            onClick={toggleTemporaryChat}
            title={
              temporaryChat
                ? "Turn off Temporary Chat"
                : "Turn on Temporary Chat"
            }
          >
            {temporaryChat ? "🔓" : "🔒"}
          </button>

        </header>


        {/* MESSAGES */}

        <section className="messages">

          {temporaryChat ? (

            temporaryMessages.length === 0 ? (

              <div className="welcome">

                <div className="welcome-logo">
                  💙
                </div>

                <h2>Temporary Chat</h2>

                <p>
                  Messages from this chat won't be saved
                  to your chat history.
                </p>

              </div>

            ) : (

              temporaryMessages.map((msg, index) => (

                <div
                  className={
                    msg.sender === "user"
                      ? "message-row user-row"
                      : "message-row assistant-row"
                  }
                  key={index}
                >

                  {msg.sender === "assistant" && (
                    <div className="avatar">
                      💙
                    </div>
                  )}

                  <div
                    className={
                      msg.sender === "user"
                        ? "user-message"
                        : "assistant-message"
                    }
                  >
                    {msg.text}
                  </div>

                </div>

              ))

            )

          ) : (

            activeChat === undefined ? (

              <div className="welcome">

                <div className="welcome-logo">
                  💙
                </div>

                <h2>Welcome to Sri</h2>

                <p>
                  Ask me anything. I'm here to help.
                </p>

              </div>

            ) : (

              activeChat.messages.map((msg, index) => (

                <div
                  className={
                    msg.sender === "user"
                      ? "message-row user-row"
                      : "message-row assistant-row"
                  }
                  key={index}
                >

                  {msg.sender === "assistant" && (
                    <div className="avatar">
                      💙
                    </div>
                  )}

                  <div
                    className={
                      msg.sender === "user"
                        ? "user-message"
                        : "assistant-message"
                    }
                  >
                    {msg.text}
                  </div>

                </div>

              ))

            )

          )}

          {/* TYPING INDICATOR */}

          {isTyping && (
            <div className="message-row assistant-row">

              <div className="avatar">
                💙
              </div>

              <div className="typing-message">

                <span></span>
                <span></span>
                <span></span>

              </div>

            </div>
          )}

          <div ref={messagesEndRef}></div>

        </section>


        {/* INPUT */}

        <div className="input-container">

          <div className="input-area">

            <input
              type="text"
              placeholder={
                temporaryChat
                  ? "Ask Sri privately..."
                  : "Ask Sri anything..."
              }
              value={message}
              disabled={isTyping}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              onKeyDown={handleKeyDown}
            />

            <button
              className={
                isTyping
                  ? "send-btn disabled"
                  : "send-btn"
              }
              onClick={sendMessage}
              disabled={isTyping}
            >
              {isTyping ? "..." : "➤"}
            </button>

          </div>

          <p className="input-hint">
            Sri can make mistakes. Check important information.
          </p>

        </div>

      </main>

    </div>
  );
}

export default App;