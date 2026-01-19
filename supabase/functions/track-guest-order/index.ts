import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_number, lookup_token } = await req.json();

    // Validate inputs
    if (!order_number || typeof order_number !== 'string') {
      return new Response(
        JSON.stringify({ error: "رقم الطلب مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lookup_token || typeof lookup_token !== 'string') {
      return new Response(
        JSON.stringify({ error: "رمز التتبع مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate order_number format (ORD-YYYY-XXXXXX)
    const orderNumberRegex = /^ORD-\d{4}-\d{6}$/;
    if (!orderNumberRegex.test(order_number)) {
      return new Response(
        JSON.stringify({ error: "صيغة رقم الطلب غير صحيحة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate lookup_token is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lookup_token)) {
      return new Response(
        JSON.stringify({ error: "رمز التتبع غير صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order with matching order_number AND lookup_token
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        created_at,
        estimated_delivery,
        delivery_type,
        recipient_name,
        shipping_city,
        shipping_district,
        total,
        subtotal,
        shipping_fee,
        discount
      `)
      .eq("order_number", order_number)
      .eq("lookup_token", lookup_token)
      .is("user_id", null) // Only guest orders
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "لم يتم العثور على الطلب. تأكد من رقم الطلب ورمز التتبع" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order items
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, product_name_ar, product_image, quantity, unit_price, total_price")
      .eq("order_id", order.id);

    // Fetch order timeline
    const { data: timeline } = await supabase
      .from("order_timeline")
      .select("status, status_ar, message, message_ar, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false });

    return new Response(
      JSON.stringify({
        order: {
          ...order,
          items: items || [],
          timeline: timeline || []
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error tracking order:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ في معالجة الطلب" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});