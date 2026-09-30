"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "agent";
  content: string;
};

export default function SmileDesignerDashboard() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "agent",
      content: "Hi! I'm Smile Designer. I can help you create and sell cosmetic dentistry mockups. What would you like to do today?\n\nOptions:\n1. Generate a smile mockup from a patient photo\n2. Publish mockups to your Shopify store\n3. View your mockup gallery\n4. Check subscription status",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dentistId] = useState(1); // In production, get from auth context
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/agents/smile-designer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Buffer.from(`${dentistId}:token`).toString("base64")}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          role: "agent",
          content: data.content,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "agent",
          content: `Error: ${data.error}`,
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "agent",
        content: "Sorry, I encountered an error. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Smile Designer</h1>
          <p className="text-gray-600">Create and sell cosmetic dentistry mockups</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Tell Smile Designer what you'd like to do..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium px-6 py-2 rounded-lg transition"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
