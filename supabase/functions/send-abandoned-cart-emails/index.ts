import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  image?: string;
}

const getAbandonedCartEmailHtml = (
  items: CartItem[],
  total: number
) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🛒 نسيت شيئاً في سلتك!</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 18px; line-height: 1.8; margin: 0 0 20px;">
                مرحباً،
              </p>
              <p style="color: #6B7280; font-size: 16px; line-height: 1.8; margin: 0 0 25px;">
                لاحظنا أنك تركت بعض المنتجات الرائعة في سلة التسوق! لا تفوّت الفرصة - أكمل طلبك الآن.
              </p>
              
              <!-- Cart Items -->
              <div style="background-color: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #374151; font-size: 16px; margin: 0 0 15px; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px;">
                  منتجاتك في الانتظار:
                </h3>
                ${items.slice(0, 3).map(item => `
                  <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <div style="flex: 1;">
                      <p style="margin: 0; color: #374151; font-size: 15px; font-weight: 500;">${item.nameAr || item.name}</p>
                      <p style="margin: 4px 0 0; color: #6B7280; font-size: 13px;">الكمية: ${item.quantity}</p>
                    </div>
                    <p style="margin: 0; color: #8B5CF6; font-size: 15px; font-weight: 600;">${(item.price * item.quantity).toFixed(2)} ر.س</p>
                  </div>
                `).join('')}
                ${items.length > 3 ? `
                  <p style="margin: 12px 0 0; color: #6B7280; font-size: 14px; text-align: center;">
                    + ${items.length - 3} منتجات أخرى
                  </p>
                ` : ''}
                <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #E5E7EB;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #374151; font-size: 17px; font-weight: 600;">الإجمالي:</span>
                    <span style="color: #8B5CF6; font-size: 20px; font-weight: 700;">${total.toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="https://calapres.lovable.app/cart" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">
                  أكمل طلبك الآن ←
                </a>
              </div>

              <!-- Urgency Message -->
              <div style="background-color: #FEF3C7; border-radius: 8px; padding: 15px; text-align: center;">
                <p style="margin: 0; color: #92400E; font-size: 14px;">
                  ⏰ المنتجات قد تنفد! أكمل طلبك قبل فوات الأوان
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 25px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; font-size: 13px; margin: 0 0 10px;">
                إذا كنت لا ترغب في استلام هذه الرسائل، يمكنك إلغاء الاشتراك
              </p>
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © 2024 كالابريس. جميع الحقوق محفوظة.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting abandoned cart email check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find abandoned carts older than 1 hour that haven't been reminded yet
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: abandonedCarts, error: fetchError } = await supabase
      .from("abandoned_carts")
      .select("*")
      .eq("reminder_sent", false)
      .eq("converted", false)
      .lt("updated_at", oneHourAgo)
      .limit(50); // Process in batches

    if (fetchError) {
      console.error("Error fetching abandoned carts:", fetchError);
      throw fetchError;
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
      console.log("No abandoned carts to process");
      return new Response(
        JSON.stringify({ message: "No abandoned carts to process", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${abandonedCarts.length} abandoned carts to process`);

    let sentCount = 0;
    let errorCount = 0;

    for (const cart of abandonedCarts) {
      try {
        const items = cart.cart_items as CartItem[];
        
        if (!items || items.length === 0) {
          continue;
        }

        // Send the email
        const { error: emailError } = await resend.emails.send({
          from: "كالابريس <onboarding@resend.dev>",
          to: [cart.email],
          subject: "🛒 نسيت شيئاً في سلتك! - كالابريس",
          html: getAbandonedCartEmailHtml(items, cart.cart_total),
          tags: [
            { name: "email_type", value: "abandoned_cart" },
            { name: "cart_id", value: cart.id },
          ],
        });

        if (emailError) {
          console.error(`Error sending email to ${cart.email}:`, emailError);
          errorCount++;
          continue;
        }

        // Mark cart as reminded
        await supabase
          .from("abandoned_carts")
          .update({
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString(),
          })
          .eq("id", cart.id);

        // Log the email event
        await supabase.from("email_events").insert({
          email_id: `abandoned_cart_${cart.id}`,
          email_type: "abandoned_cart",
          recipient_email: cart.email,
          event_type: "sent",
          user_id: cart.user_id,
          metadata: {
            cart_id: cart.id,
            cart_total: cart.cart_total,
            items_count: items.length,
          },
        });

        sentCount++;
        console.log(`Sent abandoned cart email to ${cart.email}`);
      } catch (err) {
        console.error(`Error processing cart ${cart.id}:`, err);
        errorCount++;
      }
    }

    console.log(`Completed: ${sentCount} emails sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: abandonedCarts.length,
        sent: sentCount,
        errors: errorCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Abandoned cart email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
