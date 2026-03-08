'use client';

import { useState, useRef, useEffect } from 'react';
import { api, ChatResponse, ChatReference } from '@/lib/api';
import { DEFAULT_CIRCLE_ID } from '@/lib/constants';
import Link from 'next/link';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    references?: ChatReference[];
}

interface ChatPanelProps {
    circleId?: string;
}

export default function ChatPanel({ circleId = DEFAULT_CIRCLE_ID }: ChatPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'こんにちは！お知らせについて質問があれば、お気軽にどうぞ 😊',
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const question = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: question }]);
        setIsLoading(true);

        try {
            const response: ChatResponse = await api.chat(circleId, question);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: response.assistantMessage,
                    references: response.references,
                },
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'すみません、エラーが発生しました。APIサーバーが起動しているか確認してください。',
                },
            ]);
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center z-50 transition-all duration-300 ${isOpen
                    ? 'bg-[#2a3548] text-white'
                    : 'bg-[#3b82f6] text-white hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]'
                    }`}
            >
                <span className="text-xl">{isOpen ? '✕' : '💬'}</span>
            </button>

            {/* Chat Panel */}
            <div
                className={`fixed bottom-28 right-8 w-96 h-[520px] bg-[#101829] rounded-2xl border border-[#2a3548] flex flex-col overflow-hidden z-40 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
                    }`}
                style={{ boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)' }}
            >
                {/* Header */}
                <div className="bg-[#151d2e] p-5 border-b border-[#2a3548]">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
                            <span className="text-xl">🤖</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">AI Assistant</h3>
                            <p className="text-xs text-[#5a6580]">お知らせについて質問できます</p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0a0f1c]">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                    ? 'bg-[#3b82f6] text-white rounded-br-md'
                                    : 'bg-[#151d2e] text-white rounded-bl-md border border-[#2a3548]'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                {message.references && message.references.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-[#2a3548] space-y-1">
                                        <p className="text-xs text-[#5a6580]">📚 参照元</p>
                                        {message.references.map((ref, i) => (
                                            <div key={i}>
                                                {ref.eventId ? (
                                                    <Link
                                                        href={`/events/${ref.eventId}`}
                                                        className="text-xs text-[#3b82f6] hover:underline"
                                                    >
                                                        → {ref.title}
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-[#8b98b0]">→ {ref.title}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="bg-[#151d2e] rounded-2xl rounded-bl-md px-4 py-3 border border-[#2a3548]">
                                <div className="flex gap-1.5">
                                    <span className="w-2 h-2 bg-[#3b82f6] rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-[#3b82f6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-[#3b82f6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 bg-[#101829] border-t border-[#2a3548]">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="質問を入力..."
                            className="flex-1 px-4 py-3 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6] text-sm"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="w-11 h-11 bg-[#3b82f6] text-white rounded-xl flex items-center justify-center hover:bg-[#2563eb] transition-colors disabled:opacity-40"
                        >
                            <span className="text-sm">➤</span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
