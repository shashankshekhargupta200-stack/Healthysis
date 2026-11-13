import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed or empty request payload.' },
        { status: 400 }
      );
    }

    // 1. Catch ALL possible field names sent by AuthContext.tsx
    const rawIdentifier =
      body.email ||
      body.phone ||
      body.emailOrPhone ||
      body.identifier ||
      body.contact ||
      body.username ||
      '';
    const identifier = String(rawIdentifier).trim().toLowerCase();
    const password = String(body.password || '').trim();
    const name = String(body.name || body.fullName || body.full_name || 'Patient').trim();

    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter both an email/mobile number and password.',
          message: 'Please enter both an email/mobile number and password.',
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must be at least 6 characters long.',
          message: 'Password must be at least 6 characters long.',
        },
        { status: 400 }
      );
    }

    // 2. Normalize 10-digit Indian mobile numbers (+91 or 10 digits)
    const digitsOnly = identifier.replace(/\D/g, '');
    const isPhone =
      !identifier.includes('@') && (digitsOnly.length === 10 || (digitsOnly.length === 12 && digitsOnly.startsWith('91')));
    const cleanPhone = isPhone ? digitsOnly.slice(-10) : null;
    const targetEmail = cleanPhone ? `${cleanPhone}@healthysis.app` : identifier;

    // 3. Ensure valid Supabase Project API URL (auto-fix if dashboard link was set in .env.local)
    let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    if (!supabaseUrl || supabaseUrl.includes('supabase.com/dashboard')) {
      supabaseUrl = 'https://clahmsglxaoquouciceg.supabase.co';
    }
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase Anon Key is missing in .env.local' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 4. Check if user already exists via RPC (if created)
    try {
      const { data: exists } = await supabase.rpc('check_user_exists', {
        lookup_email: targetEmail,
      });
      if (exists === true) {
        return NextResponse.json(
          {
            success: false,
            error: 'User already exists! Please go to Sign In.',
            message: 'User already exists! Please go to Sign In.',
          },
          { status: 409 }
        );
      }
    } catch {
      // Continue if RPC is not installed yet
    }

    // 5. Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: targetEmail,
      password: password,
      options: {
        data: {
          full_name: name,
          phone_number: cleanPhone,
        },
      },
    });

    if (error) {
      console.error('Supabase signup error:', error.message);
      const msg = error.message.toLowerCase();

      if (msg.includes('already registered') || msg.includes('already exists')) {
        return NextResponse.json(
          {
            success: false,
            error: 'User already exists! Please sign in instead.',
            message: 'User already exists! Please sign in instead.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: error.message,
        },
        { status: 400 }
      );
    }

    // Supabase returns an empty identities array if the email already exists when confirmations are on
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User already exists! Please sign in instead.',
          message: 'User already exists! Please sign in instead.',
        },
        { status: 409 }
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
    console.error('Unexpected signup crash:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Server error processing signup.',
        message: err?.message || 'Server error processing signup.',
      },
      { status: 500 }
    );
  }
}