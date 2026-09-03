"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import MarkdownRenderer from "../markdown"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

interface CartSummary {
  items: Array<{
    id?: string
    title?: string
    name?: string
    quantity: number
    unit_price?: number
    price?: number
  }>
  total: number
  subtotal?: number
  item_count?: number
  shipping_address?: {
    first_name?: string
    last_name?: string
    city?: string
    postal_code?: string
    address_1?: string
  } | null
}

const QUICK_SUGGESTIONS = [
  "⌚ What smartwatches do you recommend?",
  "👕 Show me Men's Organic Cotton Tees",
  "💳 Proceed to checkout & pay",
  "🛒 Show items in my cart",
]

export default function ChatWidget() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content:
        "Hello! 👋 Welcome to our store! I'm your AI Shopkeeper with live access to our 228+ products, reviews, and real shopping cart.\n\nI can help you browse products, add items to your cart, set your delivery address, and generate a payment QR code whenever you're ready to checkout!\n\nHow can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [cartState, setCartState] = useState<CartSummary | null>(null)
  const [showWelcomeBubble, setShowWelcomeBubble] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      inputRef.current?.focus()
    }
  }, [messages, isOpen])

  const handleOpen = () => {
    setIsOpen(true)
    setHasOpened(true)
    setShowWelcomeBubble(false)
  }

  const handleSendMessage = async (text?: string) => {
    const query = (text || inputValue).trim()
    if (!query || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue("")
    setIsLoading(true)

    try {
      const apiMessages = updatedMessages
        .filter((m) => m.id !== "welcome-msg")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          merchant_id: "default_merchant",
          user_id: "storefront_customer",
          country_code: "in",
        }),
      })

      const data = await res.json()

      if (data.success && data.response) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        setMessages((prev) => [...prev, assistantMessage])

        if (data.cart) {
          setCartState(data.cart)
        }

        // If the agent performed any real cart actions (add, remove, address), refresh Next.js webapp
        if (data.cartModified) {
          router.refresh()
          window.dispatchEvent(new CustomEvent("cart-updated", { detail: data.cart }))
        }
      } else {
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: data.response || "Sorry, I had trouble retrieving that from our catalog. Please try asking again!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        setMessages((prev) => [...prev, errorMsg])
      }
    } catch {
      const networkError: Message = {
        id: `net-err-${Date.now()}`,
        role: "assistant",
        content: "Network issue connecting to our store catalog. Please check your connection and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, networkError])
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome-msg",
        role: "assistant",
        content:
          "Fresh conversation started! How can I help you find items or manage your order today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ])
    setShowCartDrawer(false)
  }

  const cartItemCount = cartState?.item_count || cartState?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
  const cartTotal = cartState?.total || cartState?.items?.reduce((acc, item) => acc + (item.unit_price || item.price || 0) * item.quantity, 0) || 0

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end font-sans">
      {/* Greeting Speech Bubble when closed */}
      {!isOpen && showWelcomeBubble && !hasOpened && (
        <div className="mb-3 max-w-xs bg-white text-gray-900 border border-gray-200 shadow-xl rounded-2xl p-3 text-xs flex items-start gap-2.5 animate-bounce-short">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0 animate-ping" />
          <div>
            <p className="font-semibold text-gray-800">Need help shopping or checking out?</p>
            <p className="text-gray-500 mt-0.5">Chat with our AI Shopkeeper to add items, view your bill, and pay with QR!</p>
          </div>
          <button
            onClick={() => setShowWelcomeBubble(false)}
            className="text-gray-400 hover:text-gray-600 ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="group relative flex items-center gap-2.5 bg-neutral-900 text-white hover:bg-neutral-800 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-neutral-700"
          aria-label="Open Store Assistant"
        >
          {/* Pulsing online badge */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>

          <svg
            className="w-5 h-5 text-amber-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>

          <span className="text-sm font-medium tracking-tight">AI Shopkeeper</span>

          {cartItemCount > 0 && (
            <span className="bg-amber-400 text-neutral-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
              {cartItemCount}
            </span>
          )}
        </button>
      )}

      {/* Expandable Chat Window */}
      {isOpen && (
        <div className="w-[430px] max-w-[calc(100vw-2rem)] h-[640px] max-h-[calc(100vh-4.5rem)] bg-white border border-gray-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-neutral-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-neutral-900 font-bold text-xs shadow-sm">
                🛍️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold leading-tight">AI Shopkeeper</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Assistant
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-none mt-0.5">
                  Connected to Real Store Cart & Razorpay QR
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Reset conversation"
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Interactive Real Store Cart Bar */}
          {cartItemCount > 0 && (
            <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between text-xs text-emerald-900 transition-all">
              <button
                onClick={() => setShowCartDrawer(!showCartDrawer)}
                className="flex items-center gap-1.5 font-medium hover:underline text-left"
              >
                <span>🛒 Real Cart:</span>
                <span className="font-semibold text-emerald-800">{cartItemCount} items</span>
                <span className="text-[10px] text-emerald-600 ml-0.5">
                  {showCartDrawer ? "▲ Hide Bill" : "▼ View Bill"}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-800">₹{cartTotal.toLocaleString()}</span>
                <Link
                  href="/in/cart"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold px-2 py-0.5 rounded transition-colors"
                >
                  Checkout
                </Link>
              </div>
            </div>
          )}

          {/* Collapsible Real Cart & Bill Breakdown Drawer */}
          {showCartDrawer && cartItemCount > 0 && (
            <div className="bg-white border-b border-gray-200 p-3 text-xs shadow-inner animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between font-semibold text-gray-800 mb-2">
                <span>🧾 Itemized Real Shop Bill</span>
                {cartState?.shipping_address && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    📍 {cartState.shipping_address.city}, {cartState.shipping_address.postal_code}
                  </span>
                )}
              </div>

              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100">
                {cartState?.items?.map((item, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-gray-700 text-[11px]">
                    <span className="truncate max-w-[200px]" title={item.title || item.name}>
                      {item.title || item.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-400">×{item.quantity}</span>
                      <span className="font-medium text-gray-900">
                        ₹{(((item.unit_price || item.price || 0) * item.quantity)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-xs font-bold text-gray-900">
                <span>Grand Total</span>
                <span>₹{cartTotal.toLocaleString()}</span>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => handleSendMessage("Let's proceed to checkout and generate payment QR")}
                  disabled={isLoading}
                  className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-medium py-1.5 rounded-lg transition-colors shadow-sm text-center"
                >
                  ⚡ Pay with QR Now
                </button>
                <Link
                  href="/in/checkout"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
                >
                  Web Checkout
                </Link>
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-neutral-900 text-white rounded-br-none"
                      : "bg-white text-neutral-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  {msg.role === "user" ? (
                    <span>{msg.content}</span>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Loading / Typing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-bl-none w-fit shadow-sm">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></span>
                <span className="text-[11px] text-neutral-500 ml-1">Shopkeeper is checking catalog & updating cart...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length <= 2 && (
            <div className="px-3 pt-2 pb-1 bg-white border-t border-gray-100 flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(suggestion)}
                  disabled={isLoading}
                  className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 transition-colors disabled:opacity-50 text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="p-3 bg-white border-t border-gray-200 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about items, 'add 2 to cart', or 'pay'..."
              disabled={isLoading}
              className="flex-1 bg-gray-50 border border-gray-300 focus:border-neutral-900 focus:bg-white text-xs px-3.5 py-2.5 rounded-full outline-none transition-colors text-gray-800 placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow transition-transform active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
