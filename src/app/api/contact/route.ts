import { NextResponse } from "next/server";

const SMTP_HOST = process.env.SMTP_HOST!;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER!;
const SMTP_PASS = process.env.SMTP_PASS!;
const MAIL_FROM = process.env.MAIL_FROM!; // "Империя <no-reply@domain>"
const MAIL_TO = process.env.MAIL_TO!; // куда слать заявки

function sanitize(s?: string) {
  return (s ?? "").toString().trim().slice(0, 2000);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const json = !form ? await req.json().catch(() => ({})) : {};

    const name = sanitize(form ? form.get("name")?.toString() : json.name);
    const phone = sanitize(form ? form.get("phone")?.toString() : json.phone);
    const comment = sanitize(
      form ? form.get("comment")?.toString() : json.comment
    );
    const honey = sanitize(
      form ? form.get("website")?.toString() : json.website
    ); // honeypot

    if (honey) return NextResponse.json({ ok: true }); // боты — тихо игнорим
    if (!name || !phone) {
      return NextResponse.json(
        { ok: false, error: "empty_fields" },
        { status: 400 }
      );
    }

    const message = `🛠️ Новая заявка с сайта «Империя»
    👤 Имя: ${name}
    📞 Телефон: ${phone}
    💬 Комментарий: ${comment || "—"}`;

    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject: "Заявка с сайта — Империя",
      text: message,
      html: message.replace(/\n/g, "<br>"),
    });

    return NextResponse.json({ ok: true, sent: ["email"] });
  } catch (e) {
    console.error("contact api error:", e);
    return NextResponse.json(
      { ok: false, error: "send_failed" },
      { status: 500 }
    );
  }
}
