import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const event: ResendWebhookEvent = JSON.parse(payload);

    console.log("Received Resend webhook event:", event.type);

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
      console.log("Unhandled event type:", event.type);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Extract email type from tags or subject
    let emailType = "unknown";
    if (event.data.tags?.email_type) {
      emailType = event.data.tags.email_type;
    } else if (event.data.subject) {
      if (event.data.subject.includes("مرحباً بك") || event.data.subject.includes("Welcome")) {
        emailType = "welcome";
      } else if (event.data.subject.includes("تأكيد الطلب") || event.data.subject.includes("Order")) {
        emailType = "order_confirmation";
      } else if (event.data.subject.includes("تم شحن") || event.data.subject.includes("shipped")) {
        emailType = "status_update";
      } else if (event.data.subject.includes("تم توصيل") || event.data.subject.includes("delivered")) {
        emailType = "status_update";
      }
    }

    // Extract order_id from tags if available
    const orderId = event.data.tags?.order_id || null;
    const userId = event.data.tags?.user_id || null;

    // Insert event into database
    const { error } = await supabase.from("email_events").insert({
      email_id: event.data.email_id,
      email_type: emailType,
      recipient_email: event.data.to[0] || "",
      event_type: mappedEventType,
      order_id: orderId,
      user_id: userId,
      metadata: {
        subject: event.data.subject,
        from: event.data.from,
        resend_created_at: event.data.created_at,
        raw_event_type: event.type,
      },
    });

    if (error) {
      console.error("Error inserting email event:", error);
      throw error;
    }

    console.log(`Email event recorded: ${mappedEventType} for ${event.data.to[0]}`);

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
