'use client';

import { useState } from 'react';
import SingleEventList from './components/SingleEventList';
import PracticeList from './components/PracticeList';
import ChatPanel from '@/components/ChatPanel';
import { DEFAULT_CIRCLE_ID } from '@/lib/constants';

export default function EventsPage() {
    const [activeTab, setActiveTab] = useState<'single' | 'practice'>('single');

    return (
        <div className="max-w-2xl mx-auto relative pb-20">
            {/* Page Header */}
            <div className="flex items-end justify-between mb-6">
                <h1 className="text-2xl font-semibold text-white">イベント</h1>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.1] mb-6">
                <button
                    onClick={() => setActiveTab('single')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'single' ? 'text-white' : 'text-white/40 hover:text-white/60'
                        }`}
                >
                    単発イベント
                    {activeTab === 'single' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('practice')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'practice' ? 'text-white' : 'text-white/40 hover:text-white/60'
                        }`}
                >
                    定期・練習
                    {activeTab === 'practice' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {activeTab === 'single' ? <SingleEventList /> : <PracticeList />}
            </div>

            <ChatPanel circleId={DEFAULT_CIRCLE_ID} />
        </div>
    );
}
