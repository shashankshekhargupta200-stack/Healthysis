import { NextResponse } from "next/server";
import { createSupabaseServerAuthClient, isRecord } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Request body must be valid JSON." }, { status: 400 });
    }

    if (
      !isRecord(body)
      || typeof body.name !== "string"
      || typeof body.email !== "string"
      || typeof body.password !== "string"
      || (body.phone !== undefined && body.phone !== null && typeof body.phone !== "string")
    ) {
      return NextResponse.json({ success: false, error: "Name, email, and password are required." }, { status: 400 });
    }

    const name = body.name.trim();
    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    if (!name || name.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return NextResponse.json({
        success: false,
        error: "Enter a valid name, email, and password of at least 8 characters."
      }, { status: 400 });
    }

    const supabase = createSupabaseServerAuthClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, phone } }
    });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (!data.user) {
      return NextResponse.json({
        success: false,
        error: "Supabase did not return a user after signup."
      }, { status: 502 });
    }

    let profileWarning: string | undefined;
    if (data.session) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: name,
        phone,
        patient_id: phone
      }, { onConflict: "id" });
      if (profileError) {
        console.error("Could not save the authenticated signup profile.", profileError.message);
        profileWarning = "Your account was created, but your profile could not be saved.";
      }
    }

    return NextResponse.json({
      success: true,
      requiresEmailConfirmation: !data.session,
      user: {
        id: data.user.id,
        name,
        phone,
        email: phone ? null : email
      },
      profileWarning,
      session: data.session
        ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        }
        : null
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("Supabase signup route failed.", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Account creation is temporarily unavailable."
    }, { status: 502 });
  }
}
