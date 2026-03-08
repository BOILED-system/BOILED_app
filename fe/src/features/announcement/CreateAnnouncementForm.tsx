'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { DEFAULT_CIRCLE_ID, DEFAULT_USER_ID } from '@/lib/constants';

interface CreateAnnouncementFormProps {
    eventId: string;
    onCreated: () => void;
}

export default function CreateAnnouncementForm({ eventId, onCreated }: CreateAnnouncementFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        body: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.body) return;

        setIsSubmitting(true);
        try {
            await api.createAnnouncement({
                circleId: DEFAULT_CIRCLE_ID,
                eventId,
                title: formData.title,
                body: formData.body,
                createdBy: DEFAULT_USER_ID,
            });
            setFormData({ title: '', body: '' });
            setIsOpen(false);
            onCreated();
        } catch (error) {
            console.error('Failed to create announcement:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full py-4 rounded-xl border-2 border-dashed border-[#2a3548] text-[#8b98b0] hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors flex items-center justify-center gap-2"
            >
                <span>+</span> お知らせを追加
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
                <span>📝</span> 新しいお知らせ
            </h3>

            <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="タイトル（例: 集合場所について）"
                className="w-full px-4 py-3 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
            />

            <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="お知らせの内容..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6] resize-none"
            />

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-[#1a2438] text-[#8b98b0] hover:text-white transition-colors"
                >
                    キャンセル
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !formData.title || !formData.body}
                    className="flex-1 py-3 rounded-xl bg-[#3b82f6] text-white font-medium hover:bg-[#2563eb] transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? '作成中...' : '作成'}
                </button>
            </div>
        </form>
    );
}
