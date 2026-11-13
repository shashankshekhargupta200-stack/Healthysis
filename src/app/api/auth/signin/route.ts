import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawIdentifier = String(body.identifier || body.email || body.phone || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Please enter both your email/mobile number and password.' },
        { status: 400 }
      );
    }

    const digits = rawIdentifier.replace(/\D/g, '');
    const isPhone = !rawIdentifier.includes('@') && (digits.length === 10 || (digits.length === 12 && digits.startsWith('91')));
    const clean10 = isPhone ? digits.slice(-10) : null;
    const targetEmail = clean10 ? `91${clean10}@healthysis.app` : rawIdentifier;

    let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    if (!supabaseUrl || supabaseUrl.includes('supabase.com/dashboard')) {
      supabaseUrl = 'https://clahmsglxaoquouciceg.supabase.co';
    }
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Check if user exists first
    const { data: exists } = await supabase.rpc('check_user_exists', {
      lookup_email: targetEmail,
    });

    if (exists === false) {
      return NextResponse.json(
        { success: false, error: 'User does not exist. Please check your email/mobile number or create an account.' },
        { status: 404 }
      );
    }

    // 2. User exists -> verify password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Wrong password. Please try again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: data.user,
        session: data.session,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error during sign in.' },
      { status: 500 }
    );
  }
}