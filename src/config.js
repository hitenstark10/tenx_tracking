// ═══════════════════════════════════════════════════════
// TENX Track Learning — Frontend Configuration
// ═══════════════════════════════════════════════════════

export const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://tenx-api.onrender.com';
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://tenx-tracking.vercel.app';
export const API_BASE = BACKEND_URL;

// Website branding
export const APP_NAME = 'TENX Track Learning';
export const APP_LOGO_TEXT = 'TENX Track Learning';

// Supabase (optional — for direct client usage)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

