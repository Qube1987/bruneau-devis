import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Web Push
import webpush from "npm:web-push@3.6.7";

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const VAPID_SUBJECT = Deno.env.get("DEVIS_VAPID_SUBJECT") || Deno.env.get("VAPID_SUBJECT");
        const VAPID_PUBLIC_KEY = Deno.env.get("DEVIS_VAPID_PUBLIC_KEY") || Deno.env.get("VAPID_PUBLIC_KEY");
        const VAPID_PRIVATE_KEY = Deno.env.get("DEVIS_VAPID_PRIVATE_KEY") || Deno.env.get("VAPID_PRIVATE_KEY");

        if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            console.error("Missing VAPID configuration");
            return new Response(
                JSON.stringify({ error: "Missing VAPID configuration" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

        const body = await req.json();
        const { event, title, body: notifBody, url, tag, creator_email } = body;

        console.log(`[send-devis-push] Event: ${event}, Title: ${title}`);

        // Create Supabase client with service role
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get all push subscriptions (optionally filter out creator)
        let query = supabase
            .from("devis_push_subscriptions")
            .select("*");

        if (creator_email) {
            query = query.neq("user_email", creator_email);
        }

        const { data: subscriptions, error: fetchError } = await query;

        if (fetchError) {
            console.error("Error fetching subscriptions:", fetchError);
            return new Response(
                JSON.stringify({ error: "Error fetching subscriptions", details: fetchError }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!subscriptions || subscriptions.length === 0) {
            console.log("No subscriptions found");
            return new Response(
                JSON.stringify({ message: "No subscriptions found", sent: 0 }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Found ${subscriptions.length} subscription(s)`);

        const payload = JSON.stringify({
            title: title || "Bruneau Devis",
            body: notifBody || "Nouvelle notification",
            url: url || "/",
            tag: tag || event || "devis-notification",
            type: event,
        });

        // Send push to all subscriptions
        const results = await Promise.allSettled(
            subscriptions.map(async (sub: any) => {
                try {
                    const pushSubscription = {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    };

                    await webpush.sendNotification(pushSubscription, payload);
                    console.log(`Push sent to ${sub.user_email}`);

                    // Update last_used
                    await supabase
                        .from("devis_push_subscriptions")
                        .update({ last_used: new Date().toISOString() })
                        .eq("endpoint", sub.endpoint);

                    return { success: true, email: sub.user_email };
                } catch (error: any) {
                    console.error(`Push failed for ${sub.user_email}:`, error.statusCode, error.body);

                    // Remove expired/invalid subscriptions
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        console.log(`Removing invalid subscription for ${sub.user_email}`);
                        await supabase
                            .from("devis_push_subscriptions")
                            .delete()
                            .eq("endpoint", sub.endpoint);
                    }

                    return { success: false, email: sub.user_email, error: error.message };
                }
            })
        );

        const sent = results.filter(
            (r) => r.status === "fulfilled" && (r as any).value?.success
        ).length;
        const failed = results.length - sent;

        console.log(`Push results: ${sent} sent, ${failed} failed`);

        return new Response(
            JSON.stringify({ message: `Sent ${sent}/${subscriptions.length} push notifications`, sent, failed }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        console.error("Error in send-devis-push:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
