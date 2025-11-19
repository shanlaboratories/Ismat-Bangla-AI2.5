export enum AppView {
  SPLASH = 'SPLASH',
  AUTH = 'AUTH',
  POST_AUTH_LOADING = 'POST_AUTH_LOADING',
  DASHBOARD = 'DASHBOARD',
  INBOX = 'INBOX',
  SETTINGS = 'SETTINGS'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  audioUrl?: string; // For TTS or Audio responses
}

export interface ChatSession {
  id: string;
  title: string;
  date: number;
  preview: string;
  messages: Message[];
}

export interface AppSettings {
  language: 'bn' | 'en';
  theme: 'light' | 'dark';
  voiceGender: 'male' | 'female';
}

export type AuthMode = 'login' | 'signup';
