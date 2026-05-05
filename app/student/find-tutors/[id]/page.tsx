// File: app/student/find-tutors/[id]/page.tsx
// TIDAK ADA "use client" DI SINI

import { createClient } from '@supabase/supabase-js'
import TutorClient from './tutor-client'

export async function generateStaticParams() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing. Bypassing static params generation.");
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Ambil user_id dari database, karena kodemu mencari berdasarkan user_id
  const { data: tutors } = await supabase.from('tutor_profiles').select('user_id');

  if (!tutors) return [];

  return tutors
    .filter(tutor => tutor.user_id) // Pastikan user_id tidak kosong
    .map((tutor) => ({
      id: String(tutor.user_id),
    }));
}

export default function TutorProfilePage() {
  // Panggil komponen UI yang sudah kita pisah tadi
  return <TutorClient />
}