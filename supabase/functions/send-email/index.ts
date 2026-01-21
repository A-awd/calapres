import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Email templates
const getWelcomeEmailHtml = (name: string) => `
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
            <td style="background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">مرحباً بك في كالابريس 🎁</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 18px; line-height: 1.8; margin: 0 0 20px;">
                أهلاً ${name}،
              </p>
              <p style="color: #6B7280; font-size: 16px; line-height: 1.8; margin: 0 0 20px;">
                نحن سعداء بانضمامك إلينا! كالابريس هو وجهتك الأولى للهدايا الفاخرة والمميزة.
              </p>
              <p style="color: #6B7280; font-size: 16px; line-height: 1.8; margin: 0 0 30px;">
                استمتع بتجربة تسوق فريدة واكتشف مجموعتنا المتميزة من الهدايا لجميع المناسبات.
              </p>
              <div style="text-align: center;">
                <a href="https://calapres.lovable.app" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  ابدأ التسوق الآن
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 25px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
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

const getOrderConfirmationHtml = (
  orderNumber: string,
  recipientName: string,
  total: number,
  items: Array<{ product_name: string; quantity: number; unit_price: number }>
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
            <td style="background: linear-gradient(135deg, #10B981 0%, #34D399 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">تم استلام طلبك ✓</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 18px; line-height: 1.8; margin: 0 0 20px;">
                شكراً لك ${recipientName}،
              </p>
              <p style="color: #6B7280; font-size: 16px; line-height: 1.8; margin: 0 0 25px;">
                تم استلام طلبك بنجاح وسنبدأ بتجهيزه في أقرب وقت.
              </p>
              
              <!-- Order Info Box -->
              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 10px;">
                  <strong>رقم الطلب:</strong> ${orderNumber}
                </p>
              </div>

              <!-- Order Items -->
              <h3 style="color: #374151; font-size: 18px; margin: 0 0 15px; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">
                تفاصيل الطلب
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                ${items.map(item => `
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #374151; font-size: 15px;">
                      ${item.product_name} × ${item.quantity}
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 15px; text-align: left;">
                      ${(item.unit_price * item.quantity).toFixed(2)} ر.س
                    </td>
                  </tr>
                `).join('')}
                <tr>
                  <td style="padding: 15px 0; color: #374151; font-size: 17px; font-weight: 600;">
                    الإجمالي
                  </td>
                  <td style="padding: 15px 0; color: #8B5CF6; font-size: 17px; font-weight: 600; text-align: left;">
                    ${total.toFixed(2)} ر.س
                  </td>
                </tr>
              </table>

              <div style="text-align: center;">
                <a href="https://calapres.lovable.app/track-order" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  تتبع طلبك
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 25px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
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

const getStatusUpdateHtml = (
  orderNumber: string,
  recipientName: string,
  status: string,
  statusMessage: string
) => {
  const statusConfig: Record<string, { color: string; icon: string; title: string }> = {
    shipped: { color: '#3B82F6', icon: '🚚', title: 'تم شحن طلبك' },
    delivered: { color: '#10B981', icon: '✅', title: 'تم توصيل طلبك' },
    processing: { color: '#F59E0B', icon: '⚙️', title: 'جاري تجهيز طلبك' },
    confirmed: { color: '#8B5CF6', icon: '✓', title: 'تم تأكيد طلبك' },
  };

  const config = statusConfig[status] || { color: '#6B7280', icon: '📦', title: 'تحديث حالة الطلب' };

  return `
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
            <td style="background: ${config.color}; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">${config.icon} ${config.title}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 18px; line-height: 1.8; margin: 0 0 20px;">
                مرحباً ${recipientName}،
              </p>
              <p style="color: #6B7280; font-size: 16px; line-height: 1.8; margin: 0 0 25px;">
                ${statusMessage}
              </p>
              
              <!-- Order Info Box -->
              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
                <p style="color: #6B7280; font-size: 14px; margin: 0 0 5px;">رقم الطلب</p>
                <p style="color: #374151; font-size: 20px; font-weight: 600; margin: 0;">${orderNumber}</p>
              </div>

              <div style="text-align: center;">
                <a href="https://calapres.lovable.app/track-order" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  تتبع طلبك
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 25px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
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
};

interface EmailRequest {
  type: 'welcome' | 'order_confirmation' | 'status_update';
  to: string;
  data: {
    name?: string;
    orderNumber?: string;
    recipientName?: string;
    total?: number;
    items?: Array<{ product_name: string; quantity: number; unit_price: number }>;
    status?: string;
    statusMessage?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data }: EmailRequest = await req.json();

    console.log(`Processing email request: type=${type}, to=${to}`);

    if (!to || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subject: string;
    let html: string;

    switch (type) {
      case 'welcome':
        subject = 'مرحباً بك في كالابريس 🎁';
        html = getWelcomeEmailHtml(data.name || 'عزيزي العميل');
        break;

      case 'order_confirmation':
        subject = `تأكيد الطلب ${data.orderNumber} - كالابريس`;
        html = getOrderConfirmationHtml(
          data.orderNumber || '',
          data.recipientName || 'عزيزي العميل',
          data.total || 0,
          data.items || []
        );
        break;

      case 'status_update':
        const statusTitles: Record<string, string> = {
          shipped: 'تم شحن طلبك',
          delivered: 'تم توصيل طلبك',
          processing: 'جاري تجهيز طلبك',
          confirmed: 'تم تأكيد طلبك',
        };
        subject = `${statusTitles[data.status || ''] || 'تحديث الطلب'} - ${data.orderNumber}`;
        html = getStatusUpdateHtml(
          data.orderNumber || '',
          data.recipientName || 'عزيزي العميل',
          data.status || 'processing',
          data.statusMessage || 'تم تحديث حالة طلبك.'
        );
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid email type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    const emailResponse = await resend.emails.send({
      from: "كالابريس <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    
    // Don't fail the request, just log the error
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
