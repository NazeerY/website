/**
 * Cloudflare Pages Function: POST /api/proposal
 *
 * Required environment variable:
 *   RESEND_API_KEY
 *
 * Optional:
 *   FROM_EMAIL
 */

const TO_EMAIL = "techteam@enthira.co.in";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function clean(value, maxLength = 5000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    // Anti-spam honeypot.
    if (clean(body.website, 200)) {
      return Response.json({ ok: true });
    }

    const fullName = clean(body.fullName, 150);
    const email = clean(body.email, 254).toLowerCase();
    const organization = clean(body.organization, 200);
    const role = clean(body.role, 150);
    const service = clean(body.service, 200);
    const platform = clean(body.platform, 200);
    const scope = clean(body.scope, 5000);

    if (!fullName || !email || !scope) {
      return Response.json(
        { ok: false, message: "Please complete all required fields." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { ok: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!context.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured.");
      return Response.json(
        { ok: false, message: "Email service is not configured yet." },
        { status: 500 }
      );
    }

    const fromEmail =
      context.env.FROM_EMAIL || "Enthira Website <noreply@enthira.co.in>";

    const subject =
      `New Proposal Request - ${fullName}` +
      (organization ? ` - ${organization}` : "");

    const text = [
      "New proposal request received from the Enthira website.",
      "",
      `Full Name: ${fullName}`,
      `Work Email: ${email}`,
      `Organization: ${organization || "Not provided"}`,
      `Role: ${role || "Not provided"}`,
      `Service Required: ${service || "Not provided"}`,
      `Primary Platform: ${platform || "Not provided"}`,
      "",
      "Project Scope / Requirement:",
      scope
    ].join("\n");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${context.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [TO_EMAIL],
        reply_to: email,
        subject,
        text
      })
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);
      return Response.json(
        { ok: false, message: "We could not send your request. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Proposal API error:", error);
    return Response.json(
      { ok: false, message: "Unable to process your request right now." },
      { status: 500 }
    );
  }
}
