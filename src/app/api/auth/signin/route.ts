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
      || typeof body.identifier !== "string"
      || typeof body.password !== "string"
      || !body.identifier.trim()
      || !body.password
    ) {
      return NextResponse.json({
        success: false,
        error: "Email or phone and password are required."
      }, { status: 400 });
    }

    const identifier = body.identifier.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
    }

    const supabase = createSupabaseServerAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password: body.password
    });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (!data.session) {
      return NextResponse.json({
        success: false,
        error: "Sign-in did not return an authenticated session."
      }, { status: 502 });
    }

    const metadataName = data.user.user_metadata?.full_name;
    const metadataPhone = data.user.user_metadata?.phone;
    const name = typeof metadataName === "string" && metadataName.trim()
      ? metadataName
      : data.user.email?.split("@")[0] ?? "User";
    const phone = typeof metadataPhone === "string" && metadataPhone.trim()
      ? metadataPhone
      : null;
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: name,
      phone,
      patient_id: phone
    }, { onConflict: "id" });
    if (profileError) {
      console.error("Could not save the authenticated signin profile.", profileError.message);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        name,
        phone,
        email: data.user.email?.endsWith("@healthysis.app") ? null : data.user.email
      },
      profileWarning: profileError ? "Signed in, but your profile could not be saved." : undefined,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("Supabase signin route failed.", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Sign-in is temporarily unavailable."
    }, { status: 502 });
  }
}
