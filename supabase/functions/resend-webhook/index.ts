import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    tags?: Record<string, string>;
    headers?: Array<{ name: string; value: string }>;
  };
}

// Sanitize input to prevent log injection
function sanitizeLogInput(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[\r\n]/g, ' ').slice(0, 200);
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get webhook secret - if not configured, reject all requests
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      console.error("RESEND_WEBHOOK_SECRET is not configured - rejecting webhook");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get svix headers for signature verification
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    // Validate required headers
    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error("Missing svix headers for webhook verification");
      return new Response(
        JSON.stringify({ error: "Missing webhook signature headers" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payload = await req.text();
    
    // Verify webhook signature using standardwebhooks
    const wh = new Webhook(webhookSecret);
    const headers = {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    };
    
    let event: ResendWebhookEvent;
    try {
      event = wh.verify(payload, headers) as ResendWebhookEvent;
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Verified Resend webhook event:", sanitizeLogInput(event.type));

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map Resend event types to our event types
    const eventTypeMap: Record<string, string> = {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.delivery_delayed": "delayed",
      "email.complained": "complained",
      "email.bounced": "bounced",
      "email.opened": "opened",
      "email.clicked": "clicked",
    };

    const mappedEventType = eventTypeMap[event.type];
    if (!mappedEventType) {
      console.log("Unhandled event type:", sanitizeLogInput(event.type));
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Extract email type from tags or subject
    let emailType = "unknown";
    if (event.data.tags?.email_type) {
      emailType = sanitizeLogInput(event.data.tags.email_type);
    } else if (event.data.subject) {
      const subject = event.data.subject;
      if (subject.includes("مرحباً بك") || subject.includes("Welcome")) {
        emailType = "welcome";
      } else if (subject.includes("تأكيد الطلب") || subject.includes("Order")) {
        emailType = "order_confirmation";
      } else if (subject.includes("تم شحن") || subject.includes("shipped")) {
        emailType = "status_update";
      } else if (subject.includes("تم توصيل") || subject.includes("delivered")) {
        emailType = "status_update";
      }
    }

    // Extract order_id from tags if available (sanitize UUIDs)
    const orderId = event.data.tags?.order_id?.replace(/[^a-f0-9-]/gi, '').slice(0, 36) || null;
    const userId = event.data.tags?.user_id?.replace(/[^a-f0-9-]/gi, '').slice(0, 36) || null;

    // Sanitize recipient email
    const recipientEmail = event.data.to?.[0]?.replace(/[<>'"`;|\r\n]/g, '').slice(0, 254) || "";

    // Insert event into database with sanitized data
    const { error } = await supabase.from("email_events").insert({
      email_id: sanitizeLogInput(event.data.email_id).slice(0, 100),
      email_type: emailType.slice(0, 50),
      recipient_email: recipientEmail,
      event_type: mappedEventType,
      order_id: orderId,
      user_id: userId,
      metadata: {
        subject: sanitizeLogInput(event.data.subject).slice(0, 200),
        from: sanitizeLogInput(event.data.from).slice(0, 100),
        resend_created_at: event.data.created_at,
        raw_event_type: event.type.slice(0, 50),
      },
    });

    if (error) {
      console.error("Error inserting email event:", error);
      throw error;
    }

    console.log(`Email event recorded: ${mappedEventType} for ${recipientEmail.slice(0, 50)}`);

    return new Response(JSON.stringify({ received: true, event_type: mappedEventType }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
