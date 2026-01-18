
export interface Operator {
  id: string;
  name: string;
  avatar: string; // URL or Base64 (Square icon)
  tachieUrl?: string; // URL or Base64 (Full body portrait)
  description: string;
  personality: string;
  systemPrompt: string;
  memory?: string; // Long-term persistent memory/summary
  voiceId: string; // Mapped to Gemini TTS voices (Puck, Kore, etc.) OR Custom Character Name
  isCustom?: boolean;
  voiceSampleName?: string; // Name of uploaded voice file
  isVoiceTrained?: boolean; // UI state for having "trained" a model
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  senderName: string;
  text: string;
  timestamp: number;
  avatar?: string;
  audioUrl?: string; // If TTS generated audio
}

export interface ChatSession {
  id: string;
  operatorId: string; // 'group' for group chat
  title: string;
  createdAt: number;
  messages: Message[];
  backgroundUrl?: string;
}

export type VoiceOption = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export const AVAILABLE_VOICES: VoiceOption[] = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

export type Language = 'zh' | 'en';

export type TTSProvider = 'gemini' | 'custom';

export const MAX_CONTEXT_CHARS = 20000000; // 20 Million Characters (~20M tokens requested capacity)
