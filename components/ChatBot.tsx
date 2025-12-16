
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Sauna } from '../types';

interface ChatBotProps {
  data: Sauna[];
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Hello! I am your Löyly assistant. Ask me anything about the local saunas!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Calculate current time context
      const now = new Date();
      // Data uses 1=Mon, 7=Sun. JS uses 0=Sun, 1=Mon.
      const dayIndex = now.getDay() === 0 ? 7 : now.getDay();
      const timeContext = {
        date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        dayName: now.toLocaleDateString('en-US', { weekday: 'long' }),
        dayIndex: dayIndex
      };

      // We construct the system instruction with the current data snapshot
      // This ensures the bot knows about user edits or updates.
      const systemInstruction = `You are a helpful, friendly, and knowledgeable sauna expert assistant for the "Löyly" application in Pirkanmaa, Finland.
      
      CURRENT CONTEXT (Use this to answer questions about "today" or "now"):
      - Current Date: ${timeContext.date}
      - Current Time: ${timeContext.time}
      - Day of Week: ${timeContext.dayName}
      - Data Day Index (1=Mon ... 7=Sun): ${timeContext.dayIndex}

      Here is the complete JSON dataset of saunas available in the app:
      ${JSON.stringify(data)}

      Your goal is to help users find the perfect sauna, check opening hours, or understand specific features (like 'avanto' meaning ice swimming, or 'savusauna' meaning smoke sauna).
      
      Rules:
      1. Answer based ONLY on the provided data.
      2. If asked about a specific sauna, look up its 'id', 'nimi', 'aukioloajat' (opening hours), 'hinta' (price), and 'arvioinnit' (ratings).
      3. Be concise. Do not dump large JSON blocks. Summarize the info naturally.
      4. If the user asks for recommendations (e.g., "best heat"), look at the 'arvioinnit.loylyt' score.
      5. If the user asks "is X open right now?", compare the Current Time and Day Index against the 'aukioloajat' in the JSON.
      6. Keep the tone warm and inviting, fitting for a sauna app.
      7. FORMATTING: You may use Markdown. Use **bold** for key names/times. Use bullet points (* item) for lists.
      `;

      // Use the merged history for context
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
        },
        history: messages.slice(1).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }))
      });

      const result = await chat.sendMessage({ message: userMessage.text });
      const responseText = result.text;

      const botMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: responseText || "Sorry, I couldn't interpret the steam signals. Please try again." 
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: "I'm having trouble connecting to the sauna spirits (API error). Please try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple parser to handle bold text (**text**) and bullet points (* or -)
  const formatMessage = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    const parseInline = (str: string, keyPrefix: string) => {
      // Split by bold markers **...**
      const parts = str.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    lines.forEach((line, i) => {
      // Check for list item: starts with * or - followed by space, or indented
      const listMatch = line.match(/^(\s*)(?:-|\*)\s+(.*)/);
      
      if (listMatch) {
        const content = listMatch[2];
        currentList.push(
          <li key={`li-${i}`} className="ml-5 list-disc mb-0.5">
            {parseInline(content, `li-${i}`)}
          </li>
        );
      } else {
        // If we were building a list, flush it now
        if (currentList.length > 0) {
          elements.push(
            <ul key={`ul-${i}`} className="mb-2">
              {currentList}
            </ul>
          );
          currentList = [];
        }

        // Handle empty lines or regular text
        if (line.trim() !== '') {
          elements.push(
            <p key={`p-${i}`} className="mb-1">
              {parseInline(line, `p-${i}`)}
            </p>
          );
        } else if (i < lines.length - 1) {
            // Optional: add spacing for double newlines
            // elements.push(<div key={`br-${i}`} className="h-2"/>); 
        }
      }
    });

    // Flush remaining list
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-end`} className="mb-2">
          {currentList}
        </ul>
      );
    }

    return <div>{elements}</div>;
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center ${
          isOpen 
            ? 'bg-wood-800 text-white rotate-90' 
            : 'bg-wood-600 text-white hover:bg-wood-700'
        }`}
        title={isOpen ? "Close Chat" : "Open Sauna Assistant"}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-wood-200 overflow-hidden z-40 transition-all duration-300 origin-bottom-right transform ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none translate-y-10'
        }`}
        style={{ maxHeight: '600px', height: '70vh' }}
      >
        {/* Header */}
        <div className="bg-wood-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <div className="p-1.5 bg-wood-700 rounded-lg">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm leading-none">Löyly Assistant</h3>
              <span className="text-[10px] text-wood-300 uppercase tracking-wider">AI Powered</span>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-wood-300 hover:text-white transition-colors"
          >
            <Minimize2 size={18} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50 h-[calc(100%-8rem)]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-wood-600 text-white rounded-tr-none'
                    : 'bg-white text-stone-800 border border-stone-200 rounded-tl-none'
                }`}
              >
                {formatMessage(msg.text)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-stone-500 border border-stone-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-wood-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-wood-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-wood-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about saunas..."
              className="flex-1 bg-stone-50 border border-stone-200 text-stone-800 text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-wood-400 placeholder:text-stone-400"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-2 bg-wood-600 text-white rounded-xl hover:bg-wood-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatBot;
