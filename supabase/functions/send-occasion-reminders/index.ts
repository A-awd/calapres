import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OccasionReminder {
  id: string;
  user_id: string;
  title: string;
  title_ar: string;
  occasion_date: string;
  reminder_days_before: number;
  occasion_type: string | null;
  recipient_name: string | null;
  notes: string | null;
  is_recurring: boolean;
  is_active: boolean;
  last_reminded_at: string | null;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

// Email template for occasion reminder
const getOccasionReminderHtml = (
  customerName: string,
  occasionTitle: string,
  recipientName: string | null,
  occasionDate: string,
  daysUntil: number,
  notes: string | null,
  occasionType: string | null
) => {
  const formattedDate = new Date(occasionDate).toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const urgencyColor = daysUntil <= 3 ? '#EF4444' : daysUntil <= 7 ? '#F59E0B' : '#8B5CF6';
  const urgencyText = daysUntil === 0 ? 'اليوم!' : daysUntil === 1 ? 'غداً!' : `بعد ${daysUntil} أيام`;

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
            <td style="background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🔔 تذكير بمناسبة قادمة</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 18px; line-height: 1.8; margin: 0 0 20px;">
                مرحباً ${customerName}،
              </p>
              
              <!-- Urgency Badge -->
              <div style="background-color: ${urgencyColor}; color: white; display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 25px;">
                ${urgencyText}
              </div>

              <p style="color: #6B7280; font-size: 16px; line-height: 1.8; margin: 0 0 25px;">
                نود تذكيرك بأن لديك مناسبة قادمة وحان وقت التحضير لها!
              </p>
              
              <!-- Occasion Info Box -->
              <div style="background-color: #F3F4F6; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-right: 4px solid ${urgencyColor};">
                <h3 style="color: #374151; font-size: 20px; margin: 0 0 15px; font-weight: 600;">
                  🎁 ${occasionTitle}
                </h3>
                
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px; width: 100px;">📅 التاريخ:</td>
                    <td style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">${formattedDate}</td>
                  </tr>
                  ${recipientName ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">👤 المستلم:</td>
                    <td style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">${recipientName}</td>
                  </tr>
                  ` : ''}
                  ${occasionType ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">🏷️ النوع:</td>
                    <td style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">${occasionType}</td>
                  </tr>
                  ` : ''}
                </table>
                
                ${notes ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #E5E7EB;">
                  <p style="color: #6B7280; font-size: 14px; margin: 0 0 5px;">📝 ملاحظاتك:</p>
                  <p style="color: #374151; font-size: 14px; margin: 0; font-style: italic;">"${notes}"</p>
                </div>
                ` : ''}
              </div>

              <p style="color: #6B7280; font-size: 16px; line-height: 1.8; margin: 0 0 25px;">
                لا تدع المناسبة تفوتك! اختر الهدية المثالية الآن من مجموعتنا المتميزة.
              </p>

              <div style="text-align: center;">
                <a href="https://calapres.lovable.app/collections" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: 600;">
                  🛍️ تسوق الهدايا الآن
                </a>
              </div>

              <div style="margin-top: 25px; text-align: center;">
                <a href="https://calapres.lovable.app/occasion-reminders" style="color: #8B5CF6; font-size: 14px; text-decoration: none;">
                  إدارة التذكيرات ←
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
              <p style="color: #9CA3AF; font-size: 12px; margin: 10px 0 0;">
                تلقيت هذا الإيميل لأنك فعّلت تذكيرات المناسبات في حسابك.
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting occasion reminders check...");

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate dates to check (today + max reminder days ahead)
    const maxDaysAhead = 30; // Check up to 30 days ahead
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + maxDaysAhead);

    // Fetch all active reminders with upcoming dates
    const { data: reminders, error: remindersError } = await supabase
      .from('occasion_reminders')
      .select('*')
      .eq('is_active', true)
      .gte('occasion_date', today.toISOString().split('T')[0])
      .lte('occasion_date', futureDate.toISOString().split('T')[0]);

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} active reminders to check`);

    let processed = 0;
    let sent = 0;
    let errors = 0;

    for (const reminder of reminders || []) {
      processed++;

      try {
        // Calculate days until occasion
        const occasionDate = new Date(reminder.occasion_date);
        const daysUntil = Math.ceil((occasionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Check if we should send reminder based on reminder_days_before
        if (daysUntil !== reminder.reminder_days_before && daysUntil !== 0 && daysUntil !== 1) {
          // Not the right day to send reminder
          continue;
        }

        // Check if we already sent a reminder today
        if (reminder.last_reminded_at) {
          const lastReminded = new Date(reminder.last_reminded_at);
          lastReminded.setHours(0, 0, 0, 0);
          if (lastReminded.getTime() === today.getTime()) {
            console.log(`Already reminded for ${reminder.id} today, skipping`);
            continue;
          }
        }

        // Get user profile and email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(reminder.user_id);

        if (userError || !userData?.user?.email) {
          console.error(`Could not get user data for ${reminder.user_id}:`, userError);
          errors++;
          continue;
        }

        // Get user profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', reminder.user_id)
          .single();

        const customerName = profile?.first_name || userData.user.email.split('@')[0];

        // Send email
        const emailHtml = getOccasionReminderHtml(
          customerName,
          reminder.title_ar || reminder.title,
          reminder.recipient_name,
          reminder.occasion_date,
          daysUntil,
          reminder.notes,
          reminder.occasion_type
        );

        const emailResponse = await resend.emails.send({
          from: "كالابريز <onboarding@resend.dev>",
          to: [userData.user.email],
          subject: `🔔 تذكير: ${reminder.title_ar || reminder.title} ${daysUntil === 0 ? 'اليوم!' : daysUntil === 1 ? 'غداً!' : `بعد ${daysUntil} أيام`}`,
          html: emailHtml,
        });

        console.log(`Email sent successfully for reminder ${reminder.id}:`, emailResponse);

        // Update last_reminded_at
        await supabase
          .from('occasion_reminders')
          .update({ last_reminded_at: new Date().toISOString() })
          .eq('id', reminder.id);

        // Log email event
        await supabase.from('email_events').insert({
          email_id: emailResponse.data?.id || `reminder-${reminder.id}`,
          email_type: 'occasion_reminder',
          event_type: 'sent',
          recipient_email: userData.user.email,
          user_id: reminder.user_id,
          metadata: {
            reminder_id: reminder.id,
            occasion_date: reminder.occasion_date,
            days_until: daysUntil
          }
        });

        sent++;
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        errors++;
      }
    }

    // Handle recurring reminders that have passed
    const { data: pastRecurring } = await supabase
      .from('occasion_reminders')
      .select('*')
      .eq('is_active', true)
      .eq('is_recurring', true)
      .lt('occasion_date', today.toISOString().split('T')[0]);

    for (const reminder of pastRecurring || []) {
      // Update to next year
      const nextDate = new Date(reminder.occasion_date);
      nextDate.setFullYear(nextDate.getFullYear() + 1);

      await supabase
        .from('occasion_reminders')
        .update({ 
          occasion_date: nextDate.toISOString().split('T')[0],
          last_reminded_at: null 
        })
        .eq('id', reminder.id);

      console.log(`Updated recurring reminder ${reminder.id} to next year: ${nextDate.toISOString().split('T')[0]}`);
    }

    const result = {
      success: true,
      processed,
      sent,
      errors,
      recurring_updated: pastRecurring?.length || 0,
      timestamp: new Date().toISOString()
    };

    console.log("Occasion reminders check completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-occasion-reminders function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
