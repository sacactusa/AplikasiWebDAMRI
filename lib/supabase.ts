// lib/supabase.ts
import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://zbkfxphncwicdhchabkh.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpia2Z4cGhuY3dpY2RoY2hhYmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjM3MDUsImV4cCI6MjEwODkzOTcwNX0.hDIP-7EcZuVEOeu2Gs7yNDjaGU60SV06cfhSxp6SWLE"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
