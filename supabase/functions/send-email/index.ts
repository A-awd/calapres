import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============ Input Sanitization ============
// Sanitize user input to prevent XSS, HTML injection, and email header injection
function sanitizeInput(input: string | undefined | null, maxLength: number = 200): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove HTML angle brackets
    .replace(/["'`]/g, '') // Remove quotes that could break attributes
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/\r?\n/g, ' ') // Remove newlines (prevent header injection)
    .trim()
    .slice(0, maxLength);
}

function sanitizeEmail(email: string | undefined | null): string {
  if (!email || typeof email !== 'string') return '';
  // Basic email validation - remove anything that's not a valid email character
  const sanitized = email
    .replace(/[<>'"`;|\r\n]/g, '') // Remove dangerous characters
    .trim()
    .toLowerCase()
    .slice(0, 254); // Max email length per RFC
  
  // Simple email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

function sanitizePhone(phone: string | undefined | null): string {
  if (!phone || typeof phone !== 'string') return '';
  // Only allow digits, plus sign, spaces, and dashes
  return phone
    .replace(/[^0-9+\-\s()]/g, '')
    .trim()
    .slice(0, 20);
}

function sanitizeOrderNumber(orderNumber: string | undefined | null): string {
  if (!orderNumber || typeof orderNumber !== 'string') return '';
  // Order numbers should only contain alphanumeric and dashes
  return orderNumber
    .replace(/[^A-Za-z0-9\-]/g, '')
    .trim()
    .slice(0, 50);
}

function sanitizeNumber(value: number | undefined | null): number {
  if (value === undefined || value === null || typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  // Ensure reasonable bounds for monetary values
  return Math.max(0, Math.min(value, 1000000));
}

function sanitizeItems(items: Array<{ product_name: string; quantity: number; unit_price: number }> | undefined | null): Array<{ product_name: string; quantity: number; unit_price: number }> {
  if (!items || !Array.isArray(items)) return [];
  
  // Limit to reasonable number of items
  return items.slice(0, 50).map(item => ({
    product_name: sanitizeInput(item.product_name, 100),
    quantity: Math.max(0, Math.min(Math.floor(Number(item.quantity) || 0), 1000)),
    unit_price: sanitizeNumber(item.unit_price),
  }));
}

// ============ Email Templates ============
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
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">مرحباً بك في كالابريز 🎁</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 18px; line-height: 1.8; margin: 0 0 20px;">
                أهلاً ${name}،
              </p>
              <p style="color: #6B7280; font-size: 16px; line-height: 1.8; margin: 0 0 20px;">
                نحن سعداء بانضمامك إلينا! كالابريز هو وجهتك الأولى للهدايا الفاخرة والمميزة.
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
                © 2024 كالابريز. جميع الحقوق محفوظة.
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
                © 2024 كالابريز. جميع الحقوق محفوظة.
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
                © 2024 كالابريز. جميع الحقوق محفوظة.
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

const getAdminNotificationHtml = (
  orderNumber: string,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  city: string,
  total: number,
  items: Array<{ product_name: string; quantity: number; unit_price: number }>,
  paymentMethod: string,
  deliveryType: string
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
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🔔 طلب جديد!</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin-bottom: 25px; text-align: center;">
                <p style="color: #92400E; font-size: 18px; font-weight: 600; margin: 0;">
                  طلب جديد برقم: ${orderNumber}
                </p>
              </div>
              
              <!-- Customer Info -->
              <h3 style="color: #374151; font-size: 18px; margin: 0 0 15px; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">
                📋 بيانات العميل
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-size: 14px; width: 120px;">الاسم:</td>
                  <td style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">الهاتف:</td>
                  <td style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">
                    <a href="tel:${customerPhone}" style="color: #8B5CF6; text-decoration: none;">${customerPhone}</a>
                  </td>
                </tr>
                ${customerEmail ? `
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">البريد:</td>
                  <td style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">
                    <a href="mailto:${customerEmail}" style="color: #8B5CF6; text-decoration: none;">${customerEmail}</a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">المدينة:</td>
                  <td style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">${city}</td>
                </tr>
              </table>

              <!-- Order Details -->
              <h3 style="color: #374151; font-size: 18px; margin: 0 0 15px; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">
                🛍️ تفاصيل الطلب
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
                  <td style="padding: 15px 0; color: #10B981; font-size: 20px; font-weight: 700; text-align: left;">
                    ${total.toFixed(2)} ر.س
                  </td>
                </tr>
              </table>

              <!-- Payment & Delivery -->
              <div style="display: flex; gap: 15px; margin-bottom: 25px;">
                <div style="flex: 1; background-color: #F3F4F6; border-radius: 8px; padding: 15px; text-align: center;">
                  <p style="color: #6B7280; font-size: 12px; margin: 0 0 5px;">طريقة الدفع</p>
                  <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0;">${paymentMethod === 'cash' ? 'الدفع عند الاستلام' : 'بطاقة ائتمان'}</p>
                </div>
                <div style="flex: 1; background-color: #F3F4F6; border-radius: 8px; padding: 15px; text-align: center;">
                  <p style="color: #6B7280; font-size: 12px; margin: 0 0 5px;">نوع التوصيل</p>
                  <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0;">${deliveryType === 'express' ? 'توصيل سريع' : 'توصيل عادي'}</p>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="https://calapres.lovable.app/admin/orders" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  عرض الطلب في لوحة التحكم
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 25px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
                © 2024 كالابريز - إشعار داخلي للإدارة
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

interface EmailRequest {
  type: 'welcome' | 'order_confirmation' | 'status_update' | 'admin_notification';
  to: string;
  data: {
    name?: string;
    orderNumber?: string;
    recipientName?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    city?: string;
    total?: number;
    items?: Array<{ product_name: string; quantity: number; unit_price: number }>;
    status?: string;
    statusMessage?: string;
    paymentMethod?: string;
    deliveryType?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data }: EmailRequest = await req.json();

    console.log(`Processing email request: type=${type}`);

    // Validate and sanitize email address
    const sanitizedTo = sanitizeEmail(to);
    if (!sanitizedTo || !type) {
      console.error("Invalid email address or missing type");
      return new Response(
        JSON.stringify({ error: "Missing or invalid required fields: to, type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email type
    const validTypes = ['welcome', 'order_confirmation', 'status_update', 'admin_notification'];
    if (!validTypes.includes(type)) {
      console.error(`Invalid email type: ${type}`);
      return new Response(
        JSON.stringify({ error: "Invalid email type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize all input data
    const sanitizedData = {
      name: sanitizeInput(data.name, 100) || 'عزيزي العميل',
      orderNumber: sanitizeOrderNumber(data.orderNumber),
      recipientName: sanitizeInput(data.recipientName, 100) || 'عزيزي العميل',
      customerName: sanitizeInput(data.customerName, 100) || 'عميل',
      customerPhone: sanitizePhone(data.customerPhone),
      customerEmail: sanitizeEmail(data.customerEmail),
      city: sanitizeInput(data.city, 50),
      total: sanitizeNumber(data.total),
      items: sanitizeItems(data.items),
      status: sanitizeInput(data.status, 20) || 'processing',
      statusMessage: sanitizeInput(data.statusMessage, 500) || 'تم تحديث حالة طلبك.',
      paymentMethod: ['cash', 'card'].includes(data.paymentMethod || '') ? data.paymentMethod : 'cash',
      deliveryType: ['standard', 'express'].includes(data.deliveryType || '') ? data.deliveryType : 'standard',
    };

    let subject: string;
    let html: string;

    switch (type) {
      case 'welcome':
        subject = 'مرحباً بك في كالابريز 🎁';
        html = getWelcomeEmailHtml(sanitizedData.name);
        break;

      case 'order_confirmation':
        subject = `تأكيد الطلب ${sanitizedData.orderNumber} - كالابريز`;
        html = getOrderConfirmationHtml(
          sanitizedData.orderNumber,
          sanitizedData.recipientName,
          sanitizedData.total,
          sanitizedData.items
        );
        break;

      case 'status_update':
        const statusTitles: Record<string, string> = {
          shipped: 'تم شحن طلبك',
          delivered: 'تم توصيل طلبك',
          processing: 'جاري تجهيز طلبك',
          confirmed: 'تم تأكيد طلبك',
        };
        subject = `${statusTitles[sanitizedData.status] || 'تحديث الطلب'} - ${sanitizedData.orderNumber}`;
        html = getStatusUpdateHtml(
          sanitizedData.orderNumber,
          sanitizedData.recipientName,
          sanitizedData.status,
          sanitizedData.statusMessage
        );
        break;

      case 'admin_notification':
        subject = `🔔 طلب جديد: ${sanitizedData.orderNumber} - ${sanitizedData.customerName}`;
        html = getAdminNotificationHtml(
          sanitizedData.orderNumber,
          sanitizedData.customerName,
          sanitizedData.customerPhone,
          sanitizedData.customerEmail,
          sanitizedData.city,
          sanitizedData.total,
          sanitizedData.items,
          sanitizedData.paymentMethod!,
          sanitizedData.deliveryType!
        );
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid email type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    const emailResponse = await resend.emails.send({
      from: "كالابريز <onboarding@resend.dev>",
      to: [sanitizedTo],
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
