import { supabase } from "@/integrations/supabase/client";

interface EmailData {
  name?: string;
  orderNumber?: string;
  recipientName?: string;
  total?: number;
  items?: Array<{ product_name: string; quantity: number; unit_price: number }>;
  status?: string;
  statusMessage?: string;
}

type EmailType = 'welcome' | 'order_confirmation' | 'status_update';

/**
 * Send transactional email via backend edge function
 * This function handles errors gracefully - if email fails, it logs the error
 * but doesn't throw, so it won't break the main flow
 */
export const sendEmail = async (
  type: EmailType,
  to: string,
  data: EmailData
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: response, error } = await supabase.functions.invoke('send-email', {
      body: { type, to, data }
    });

    if (error) {
      console.error('Email service error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email to new user
 */
export const sendWelcomeEmail = async (email: string, name: string) => {
  return sendEmail('welcome', email, { name });
};

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = async (
  email: string,
  orderNumber: string,
  recipientName: string,
  total: number,
  items: Array<{ product_name: string; quantity: number; unit_price: number }>
) => {
  return sendEmail('order_confirmation', email, {
    orderNumber,
    recipientName,
    total,
    items
  });
};

/**
 * Send order status update email
 */
export const sendStatusUpdateEmail = async (
  email: string,
  orderNumber: string,
  recipientName: string,
  status: string,
  statusMessage: string
) => {
  return sendEmail('status_update', email, {
    orderNumber,
    recipientName,
    status,
    statusMessage
  });
};
