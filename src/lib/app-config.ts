import { db } from "@/lib/db"
import { encryptSecret, decryptSecret } from "@/lib/secret-box"
import { currentTenant, PLATFORM } from "@/lib/tenant"

/**
 * Settings an administrator can change from the panel.
 *
 * Each of these was previously an environment variable only, which meant
 * changing one required editing a file on the server — and the file the
 * service reads is not the one inside the release directory, so an edit could
 * appear to work and change nothing.
 *
 * A saved value overrides the environment. The environment seeds a new
 * deployment and is superseded from then on.
 */

export interface ConfigField {
  key: string
  label: string
  /** Never returned to the browser; only whether it is set. */
  secret?: boolean
  envVar: string
  hint?: string
  options?: string[]
}

export interface ConfigGroup {
  id: string
  title: string
  description: string
  fields: ConfigField[]
}

export const CONFIG_GROUPS: ConfigGroup[] = [
  {
    id: "payments",
    title: "AmwalPay",
    description: "Card payments. Changing these switches which merchant account takes money.",
    fields: [
      { key: "amwalpay_merchant_id", label: "Merchant ID (MID)", envVar: "AMWALPAY_MERCHANT_ID" },
      { key: "amwalpay_terminal_id", label: "Terminal ID (TID)", envVar: "AMWALPAY_TERMINAL_ID" },
      { key: "amwalpay_secure_key", label: "Secure key", envVar: "AMWALPAY_SECURE_KEY", secret: true, hint: "Hex key used to sign requests and verify callbacks" },
      { key: "amwalpay_mode", label: "Mode", envVar: "AMWALPAY_MODE", options: ["test", "production"], hint: "Production sends real charges" },
    ],
  },
  {
    id: "paymob",
    title: "Paymob Gateway",
    description: "Card and mobile wallet payments across GCC & Egypt via Paymob Intention API and Unified Checkout.",
    fields: [
      { key: "paymob_api_key", label: "Secret Key (API Key)", envVar: "PAYMOB_API_KEY", secret: true, hint: "Secret key from Paymob Dashboard Settings > Account Info" },
      { key: "paymob_public_key", label: "Public Key", envVar: "PAYMOB_PUBLIC_KEY", hint: "Public key used to initialize Unified Checkout" },
      { key: "paymob_hmac_secret", label: "HMAC Secret", envVar: "PAYMOB_HMAC_SECRET", secret: true, hint: "Used to verify webhook transaction signatures (SHA-512)" },
      { key: "paymob_region", label: "Region", envVar: "PAYMOB_REGION", options: ["oman", "egypt", "ksa", "uae"], hint: "Oman (oman.paymob.com), Egypt (accept.paymob.com), KSA (ksa.paymob.com), UAE (uae.paymob.com)" },
      { key: "paymob_integration_id_card", label: "Card Integration ID", envVar: "PAYMOB_INTEGRATION_ID_CARD", hint: "Integration ID for Visa, Mastercard, OmanNet, MADA" },
      { key: "paymob_integration_id_wallet", label: "Wallet Integration ID", envVar: "PAYMOB_INTEGRATION_ID_WALLET", hint: "Optional: Integration ID for Mobile Wallets" },
      { key: "paymob_mode", label: "Mode", envVar: "PAYMOB_MODE", options: ["test", "production"], hint: "Test mode uses sandbox credentials" },
    ],
  },
  {
    id: "invoice_company",
    title: "Invoice issuer",
    description:
      "Whose details appear at the top and bottom of a subscription invoice. This is the platform's own " +
      "company, not a workspace's — it is who the invoice is from.",
    fields: [
      { key: "invoice_company_name", label: "Company name", envVar: "INVOICE_COMPANY_NAME" },
      { key: "invoice_company_tagline", label: "Tagline", envVar: "INVOICE_COMPANY_TAGLINE" },
      { key: "invoice_company_email", label: "Email", envVar: "INVOICE_COMPANY_EMAIL" },
      { key: "invoice_company_phone", label: "Phone", envVar: "INVOICE_COMPANY_PHONE" },
      { key: "invoice_company_address", label: "Address", envVar: "INVOICE_COMPANY_ADDRESS" },
      { key: "invoice_company_website", label: "Website", envVar: "INVOICE_COMPANY_WEBSITE", hint: "Also encoded in the QR code on the invoice." },
      { key: "invoice_signature_url", label: "Authorized Signature URL", envVar: "INVOICE_SIGNATURE_URL", hint: "Image URL or data URI of the authorized signature." },
      { key: "invoice_signatory_name", label: "Signatory Name / Title", envVar: "INVOICE_SIGNATORY_NAME", hint: "Name or designation printed under the signature (e.g. Authorized Signatory)." },
    ],
  },
  {
    id: "booking_terms",
    title: "Booking terms",
    description:
      "Shown in WhatsApp before a customer gives their name, with Accept and Decline buttons. " +
      "Left empty, the bot asks nothing and the booking continues — it will never show another business's terms.",
    fields: [
      { key: "booking_terms", label: "Terms (English)", envVar: "BOOKING_TERMS", hint: "Cancellation, age and safety rules, dress code — whatever a customer must agree to." },
      { key: "booking_terms_ar", label: "Terms (Arabic)", envVar: "BOOKING_TERMS_AR", hint: "Left empty, Arabic customers are shown the English text." },
    ],
  },
  {
    id: "platform_payments",
    title: "Platform gateway",
    description:
      "Where subscription fees are collected. This is the platform's own merchant account — " +
      "separate from the one each business uses to take its customers' money.",
    fields: [
      {
        key: "platform_active_gateway",
        label: "Active Platform Gateway",
        envVar: "PLATFORM_ACTIVE_GATEWAY",
        options: ["BOTH", "AUTO", "PAYMOB", "AMWALPAY"],
        hint: "BOTH lets tenants choose Paymob or AmwalPay at checkout. AUTO defaults to Paymob, falling back to AmwalPay. Select PAYMOB or AMWALPAY to force a specific gateway.",
      },
      { key: "platform_paymob_api_key", label: "Paymob Platform Secret API Key", envVar: "PLATFORM_PAYMOB_API_KEY", secret: true, hint: "Secret token / API key for platform Unified Checkout intentions" },
      { key: "platform_paymob_public_key", label: "Paymob Platform Public Key", envVar: "PLATFORM_PAYMOB_PUBLIC_KEY", hint: "Public key for redirecting tenants to Paymob hosted checkout" },
      { key: "platform_paymob_hmac_secret", label: "Paymob Platform HMAC Secret", envVar: "PLATFORM_PAYMOB_HMAC_SECRET", secret: true, hint: "Used to cryptographically verify platform subscription webhooks" },
      {
        key: "platform_paymob_region",
        label: "Paymob Platform Region",
        envVar: "PLATFORM_PAYMOB_REGION",
        options: ["oman", "egypt", "ksa", "uae"],
        hint: "Regional Paymob endpoint for platform charges (default: oman)",
      },
      { key: "platform_paymob_integration_id_card", label: "Paymob Card Integration ID", envVar: "PLATFORM_PAYMOB_INTEGRATION_ID_CARD", hint: "Platform card payment integration ID" },
      { key: "platform_paymob_integration_id_wallet", label: "Paymob Wallet Integration ID", envVar: "PLATFORM_PAYMOB_INTEGRATION_ID_WALLET", hint: "Platform wallet integration ID (optional)" },
      { key: "platform_paymob_mode", label: "Paymob Mode", envVar: "PLATFORM_PAYMOB_MODE", options: ["test", "production"], hint: "Production takes real subscription money" },
      { key: "platform_amwalpay_merchant_id", label: "AmwalPay Merchant ID (MID)", envVar: "PLATFORM_AMWALPAY_MERCHANT_ID" },
      { key: "platform_amwalpay_terminal_id", label: "AmwalPay Terminal ID (TID)", envVar: "PLATFORM_AMWALPAY_TERMINAL_ID" },
      { key: "platform_amwalpay_secure_key", label: "AmwalPay secure key", envVar: "PLATFORM_AMWALPAY_SECURE_KEY", secret: true, hint: "Hex key used to sign subscription payments" },
      { key: "platform_amwalpay_mode", label: "AmwalPay Mode", envVar: "PLATFORM_AMWALPAY_MODE", options: ["test", "production"], hint: "Production sends real charges" },
    ],
  },
  {
    id: "email",
    title: "Email (SMTP)",
    description: "Order confirmations and invoices. With no host set, email is reported as unavailable rather than silently dropped.",
    fields: [
      { key: "smtp_host", label: "SMTP host", envVar: "SMTP_HOST", hint: "e.g. smtp.gmail.com" },
      { key: "smtp_port", label: "Port", envVar: "SMTP_PORT", hint: "587 for STARTTLS, 465 for TLS" },
      { key: "smtp_user", label: "Username", envVar: "SMTP_USER" },
      { key: "smtp_password", label: "Password", envVar: "SMTP_PASSWORD", secret: true },
      { key: "smtp_from", label: "From address", envVar: "SMTP_FROM", hint: 'e.g. Oman Adventures <no-reply@…>' },
      {
        key: "smtp_allow_self_signed",
        label: "Accept a self-signed certificate",
        envVar: "SMTP_ALLOW_SELF_SIGNED",
        hint: "on — only for a mail server on this same machine. Anywhere else this disables the check that the server is who it claims to be.",
      },
    ],
  },
  {
    id: "embedded_signup",
    title: "Embedded Signup (Meta)",
    description:
      "What a business needs to connect its own WhatsApp number from inside Facebook. The app id and configuration id are public; the secret is not.",
    fields: [
      { key: "meta_app_id", label: "Meta app ID", envVar: "META_APP_ID" },
      { key: "meta_app_secret", label: "Meta app secret", envVar: "META_APP_SECRET", secret: true },
      {
        key: "meta_config_id",
        label: "Login configuration ID",
        envVar: "META_CONFIG_ID",
        hint:
          "Facebook Login for Business → Configurations → Create from template → " +
          "\"WhatsApp Embedded Signup\". It must be a Login for Business configuration: " +
          "an ordinary Facebook Login one signs the customer in and returns no sign-up code, " +
          "which looks exactly like them closing the window.",
      },
      { key: "meta_business_id", label: "Your business portfolio ID", envVar: "META_BUSINESS_ID" },
      {
        key: "meta_graph_version",
        label: "Graph API version",
        envVar: "META_GRAPH_VERSION",
        hint: "e.g. v21.0",
      },
    ],
  },
  {
    id: "social_automation",
    title: "Facebook & Instagram Automation",
    description:
      "Setup guide:\n" +
      "1. Facebook Pages reuse the Meta app id/secret from Embedded Signup above — no second app. In that app, add the redirect URI https://app.fizmoh.cloud/api/social/oauth/facebook/callback under Facebook Login → Settings.\n" +
      "2. In the same Meta app, add the \"Instagram\" product → \"API setup with Instagram login\", copy its own App ID/secret into the two fields below, and add https://app.fizmoh.cloud/api/social/oauth/instagram/callback as its redirect URI.\n" +
      "3. Under Webhooks (both the Page and the Instagram product), subscribe to fields \"messages\", \"messaging_postbacks\", \"feed\" (Page) / \"messages\", \"comments\" (Instagram), pointing at /api/social/webhook/facebook and /api/social/webhook/instagram, using the verify token below.\n" +
      "4. Facebook permissions needed: pages_show_list, pages_manage_metadata, pages_messaging, pages_read_engagement, business_management. Instagram permissions needed: instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments.\n" +
      "5. Connecting a test Page/account (App Roles → Testers) works immediately. Real customer traffic needs Meta's App Review to approve these as Advanced Access — submit that from the Meta Developer dashboard's App Review tab. Check which permissions a connected account actually has, live, from Social Channels → Overview → \"Check permissions\".",
    fields: [
      { key: "meta_instagram_app_id", label: "Instagram app ID", envVar: "META_INSTAGRAM_APP_ID", hint: "Meta Developer App → Instagram → API setup with Instagram login" },
      { key: "meta_instagram_app_secret", label: "Instagram app secret", envVar: "META_INSTAGRAM_APP_SECRET", secret: true },
      {
        key: "social_webhook_verify_token", label: "Webhook verify token", envVar: "SOCIAL_WEBHOOK_VERIFY_TOKEN", secret: true,
        hint: "Any string you choose — enter the same value in Meta's webhook setup (Facebook Page and Instagram webhooks both use it) for the verification handshake.",
      },
    ],
  },
  {
    id: "broadcast",
    title: "Broadcast",
    description: "When a campaign may reach people, and how fast it is allowed to send.",
    fields: [
      {
        key: "quiet_hours_end",
        label: "Do not send before",
        envVar: "QUIET_HOURS_END",
        hint: "24-hour time in Muscat, e.g. 08:00. A campaign waits rather than waking somebody up.",
      },
      {
        key: "quiet_hours_start",
        label: "Do not send after",
        envVar: "QUIET_HOURS_START",
        hint: "e.g. 21:00",
      },
    ],
  },
  {
    id: "push",
    title: "Push notifications (OneSignal)",
    description: "Alerts that reach staff when the panel is closed. The App ID is public; the REST key is not.",
    fields: [
      { key: "onesignal_app_id", label: "App ID", envVar: "ONESIGNAL_APP_ID", hint: "Settings → Keys & IDs" },
      { key: "onesignal_safari_id", label: "Safari web ID", envVar: "ONESIGNAL_SAFARI_WEB_ID", hint: "Optional — only for Safari 15 and older" },
      { key: "onesignal_rest_key", label: "REST API key", envVar: "ONESIGNAL_REST_API_KEY", secret: true, hint: "Server-side sending. Never exposed to the browser." },
    ],
  },
  {
    id: "calendar",
    title: "Google Calendar",
    description: "Confirmed bookings appear in a shared calendar, and come off it when cancelled.",
    fields: [
      { key: "google_calendar_id", label: "Calendar ID", envVar: "GOOGLE_CALENDAR_ID", hint: "Ends in @group.calendar.google.com" },
      { key: "google_service_account", label: "Service account JSON", envVar: "GOOGLE_SERVICE_ACCOUNT", secret: true, hint: "The whole downloaded key file, pasted in" },
    ],
  },
  {
    id: "meet",
    title: "Appointments & Google Meet",
    description: "Consultations booked by customers, and the video link they join on.",
    fields: [
      { key: "appointments_enabled", label: "Enable appointments", envVar: "APPOINTMENTS_ENABLED", options: ["off", "on"], hint: "Off hides the whole section from the sidebar" },
      { key: "appointment_services", label: "Services offered", envVar: "APPOINTMENT_SERVICES", hint: "One per line. These are what a customer picks from." },
      { key: "appointment_duration", label: "Default length (minutes)", envVar: "APPOINTMENT_DURATION" },
      { key: "appointment_slots", label: "Bookable times", envVar: "APPOINTMENT_SLOTS", hint: "24-hour, one per line or comma separated — 10:00, 11:00, 16:00 …" },
      { key: "google_meet_link", label: "Standing Meet room", envVar: "GOOGLE_MEET_LINK", hint: "https://meet.google.com/xxx-xxxx-xxx — used when no per-appointment link can be made" },
      {
        key: "google_oauth_client_id", label: "OAuth client ID", envVar: "GOOGLE_OAUTH_CLIENT_ID",
        hint:
          "Needed for a fresh Meet link per appointment. Also used by Digital QR Addons → " +
          "Google Business Profile — that connect flow needs its own redirect URI added " +
          "in Google Cloud Console alongside this one: {base URL}/api/google-business/callback.",
      },
      { key: "google_oauth_client_secret", label: "OAuth client secret", envVar: "GOOGLE_OAUTH_CLIENT_SECRET", secret: true },
      { key: "google_oauth_refresh_token", label: "Connected account token", envVar: "GOOGLE_OAUTH_REFRESH_TOKEN", secret: true, hint: "Set by the Connect button — not filled in by hand" },
      { key: "google_oauth_account", label: "Connected account", envVar: "GOOGLE_OAUTH_ACCOUNT", hint: "Shown for reference" },
    ],
  },
  {
    id: "visa",
    title: "Visa assistance",
    description: "Enquiries about Oman visas, taken over WhatsApp and worked in the panel.",
    fields: [
      { key: "visa_enabled", label: "Enable visa assistance", envVar: "VISA_ENABLED", options: ["off", "on"], hint: "Off hides the section and stops the WhatsApp flow" },
      { key: "visa_brand_name", label: "Visa brand name", envVar: "VISA_BRAND_NAME", hint: "Shown to customers in the visa conversation" },
      { key: "visa_contact_phone", label: "Visa contact number", envVar: "VISA_CONTACT_PHONE", hint: "Given to customers when an enquiry is received" },
    ],
  },
  {
    id: "business",
    title: "Business",
    description: "Details used across confirmations, vouchers and the customer site.",
    fields: [
      { key: "business_name", label: "Business name", envVar: "BUSINESS_NAME", hint: "Shown on your shop, confirmations and vouchers" },
      { key: "business_phone", label: "Support phone", envVar: "BUSINESS_PHONE" },
      { key: "business_email", label: "Support email", envVar: "BUSINESS_EMAIL" },
      { key: "business_address", label: "Address", envVar: "BUSINESS_ADDRESS", hint: "Where you are. Used on vouchers and when a customer asks." },
      { key: "business_website", label: "Website", envVar: "BUSINESS_WEBSITE" },
      { key: "business_logo", label: "Logo URL", envVar: "BUSINESS_LOGO", hint: "Square image, shown at the top of your shop" },
      {
        key: "business_about",
        label: "About your business",
        envVar: "BUSINESS_ABOUT",
        hint:
          "Written for the AI as much as for people: what you sell, where you operate, your " +
          "hours, your policies. Everything here is context the assistant can use when it " +
          "answers a customer, so vagueness here becomes vagueness in the replies.",
      },
      { key: "business_tone", label: "How replies should sound", envVar: "BUSINESS_TONE", hint: "e.g. warm and brief, formal, Omani Arabic and English" },
      { key: "base_url", label: "Public site URL", envVar: "NEXT_PUBLIC_BASE_URL", hint: "Used to build links in messages and PDFs" },
      {
        key: "bot_enabled",
        label: "Bot",
        envVar: "BOT_ENABLED",
        options: ["true", "false"],
        hint: "Off, incoming WhatsApp messages get no automated reply at all — a person must answer every one.",
      },
      {
        key: "ai_assistant_enabled",
        label: "AI assistant",
        envVar: "AI_ASSISTANT_ENABLED",
        options: ["true", "false"],
        hint:
          "Whether the AI answers messages the booking flow does not claim. Off, those go to a " +
          "human instead — the menu, buttons and booking flow keep working either way.",
      },
      {
        key: "assistant_name",
        label: "Assistant name",
        envVar: "ASSISTANT_NAME",
        hint: "Who the bot says it is, e.g. Najwa. Left empty, it greets on behalf of the business instead.",
      },
      {
        key: "vat_rate",
        label: "VAT rate (%)",
        envVar: "VAT_RATE",
        hint: "Added to bookings and shown on invoices. Oman is 5. Set 0 if you do not charge VAT.",
      },
      {
        key: "vat_number",
        label: "VAT registration number",
        envVar: "VAT_NUMBER",
        hint: "Printed on invoices. Left empty, the invoice omits the line rather than inventing one.",
      },
      {
        key: "marketing_partners",
        label: "Homepage partner logos",
        envVar: "MARKETING_PARTNERS",
        hint:
          'JSON list shown in the "Certified & integrated with" strip on the homepage, e.g. ' +
          '[{"label":"Meta Cloud API","tag":"Verified Partner"}]. Leave empty to show the built-in list. ' +
          "Only claim certifications and integrations you actually hold.",
      },
      {
        key: "menu_shortcuts",
        label: "Extra menu button",
        envVar: "MENU_SHORTCUTS",
        hint:
          'JSON, e.g. [{"title":"🎓 Training","category":"education"}] — adds a button to the ' +
          "WhatsApp opening menu that lists only that category. WhatsApp allows three buttons " +
          "and two are taken, so only the first is shown.",
      },
    ],
  },
  {
    id: "seo",
    title: "SEO & metadata",
    description: "Titles, descriptions and keywords for the public website. Blank fields keep the built-in defaults.",
    fields: [
      { key: "seo_site_name", label: "Site name", envVar: "SEO_SITE_NAME", hint: "Appended after every page title" },
      { key: "seo_default_title", label: "Homepage title", envVar: "SEO_DEFAULT_TITLE", hint: "Aim for 50-60 characters — Google truncates beyond that" },
      { key: "seo_title_template", label: "Title template", envVar: "SEO_TITLE_TEMPLATE", hint: 'Must contain %s, e.g. "%s | Fizmoh"' },
      {
        key: "seo_description",
        label: "Default meta description",
        envVar: "SEO_DESCRIPTION",
        hint: "150-160 characters. Shown under your result in search — write it for a person, not a crawler.",
      },
      {
        key: "seo_keywords",
        label: "Keywords",
        envVar: "SEO_KEYWORDS",
        hint: "Comma separated. Google ignores this tag, but Bing and several regional engines still read it.",
      },
      { key: "seo_og_image", label: "Social share image", envVar: "SEO_OG_IMAGE", hint: "1200x630 URL or path. Used for WhatsApp, LinkedIn and X previews." },
      { key: "seo_twitter_handle", label: "X / Twitter handle", envVar: "SEO_TWITTER_HANDLE", hint: "Including the @" },
      {
        key: "seo_page_overrides",
        label: "Per-page overrides",
        envVar: "SEO_PAGE_OVERRIDES",
        hint:
          'JSON keyed by path, e.g. {"/pricing":{"title":"Pricing","description":"...","keywords":"a, b"}}. ' +
          "Anything omitted falls back to the defaults above.",
      },
    ],
  },
  {
    id: "woocommerce",
    title: "WooCommerce",
    description:
      "Connects a WooCommerce store to this workspace. The webhook URL must name " +
      "the workspace, and the secret is what proves a delivery really came from " +
      "your store.",
    fields: [
      {
        key: "woocommerce_webhook_secret",
        label: "Webhook secret",
        envVar: "WOOCOMMERCE_WEBHOOK_SECRET",
        secret: true,
        hint:
          "The same secret you set on the webhook in WooCommerce. Without it any " +
          "caller can post an order to this platform and have a WhatsApp message " +
          "sent to any number they choose.",
      },
    ],
  },
  {
    id: "storefront",
    title: "Your website",
    description:
      "What customers see at your public address. Everything here is optional — " +
      "anything left blank is left out of the page rather than filled with " +
      "somebody else's words.",
    fields: [
      { key: "site_tagline", label: "Tagline", envVar: "SITE_TAGLINE", hint: "The small line under your name, e.g. Tours & Activities" },
      { key: "site_hero_title", label: "Headline", envVar: "SITE_HERO_TITLE", hint: "The first line of the banner. Defaults to your business name." },
      { key: "site_hero_accent", label: "Headline second line", envVar: "SITE_HERO_ACCENT", hint: "Shown underneath in your accent colour" },
      { key: "site_hero_subtitle", label: "Banner text", envVar: "SITE_HERO_SUBTITLE", hint: "One or two lines saying what you sell" },
      {
        key: "site_hero_badge",
        label: "Banner badge",
        envVar: "SITE_HERO_BADGE",
        hint:
          "The small pill above the headline. Claims here are yours to stand " +
          "behind — ratings and traveller counts included — so leave it blank " +
          "unless it is true of your business.",
      },
      { key: "site_hero_image", label: "Banner image URL", envVar: "SITE_HERO_IMAGE", hint: "Wide photo behind the banner" },
      { key: "site_brand_color", label: "Brand colour", envVar: "SITE_BRAND_COLOR", hint: "Hex, e.g. #0F766E. Used for buttons and highlights." },
      { key: "site_accent_color", label: "Accent colour", envVar: "SITE_ACCENT_COLOR", hint: "Hex, e.g. #FBBF24. Used for the second headline line." },
      { key: "site_story", label: "Your story", envVar: "SITE_STORY", hint: "Shown on the About page. Left out entirely if blank." },
      { key: "site_mission", label: "Mission", envVar: "SITE_MISSION" },
      {
        key: "site_stats",
        label: "Numbers to show",
        envVar: "SITE_STATS",
        hint:
          "Four at most, as label=value pairs separated by commas — " +
          "e.g. Tours=50+, Travellers=2.4K+, Rating=4.8★. Blank shows nothing.",
      },
      { key: "site_facebook", label: "Facebook URL", envVar: "SITE_FACEBOOK" },
      { key: "site_instagram", label: "Instagram URL", envVar: "SITE_INSTAGRAM" },
      { key: "site_twitter", label: "X / Twitter URL", envVar: "SITE_TWITTER" },
      { key: "site_youtube", label: "YouTube URL", envVar: "SITE_YOUTUBE" },
    ],
  },
  {
    id: "analytics_seo",
    title: "Analytics, SEO & Webmaster",
    description: "Google Analytics 4, Search Console verification, Meta Pixel, Google Tag Manager, and custom tracking scripts.",
    fields: [
      { key: "google_analytics_id", label: "Google Analytics 4 (GA4) Measurement ID", envVar: "NEXT_PUBLIC_GA_ID", hint: "e.g. G-XXXXXXXXXX" },
      { key: "google_tag_manager_id", label: "Google Tag Manager (GTM) Container ID", envVar: "NEXT_PUBLIC_GTM_ID", hint: "e.g. GTM-XXXXXXX" },
      { key: "google_site_verification", label: "Google Search Console Verification Token", envVar: "GOOGLE_SITE_VERIFICATION", hint: "The content string from <meta name='google-site-verification' content='...' />" },
      { key: "bing_site_verification", label: "Bing Webmaster Verification Token", envVar: "BING_SITE_VERIFICATION", hint: "The content string from <meta name='msvalidate.01' content='...' />" },
      { key: "meta_pixel_id", label: "Meta (Facebook) Pixel ID", envVar: "NEXT_PUBLIC_META_PIXEL_ID", hint: "e.g. 1234567890123456" },
      { key: "custom_head_scripts", label: "Custom Header Tracking Scripts", envVar: "CUSTOM_HEAD_SCRIPTS", hint: "HTML / JS injected into <head> (e.g. Hotjar, Microsoft Clarity, Crisp)" },
      { key: "custom_body_scripts", label: "Custom Body Tracking Scripts", envVar: "CUSTOM_BODY_SCRIPTS", hint: "HTML / JS injected before </body>" },
    ],
  },
]

const ALL_FIELDS = new Map(CONFIG_GROUPS.flatMap(g => g.fields.map(f => [f.key, f])))

/**
 * Settings that belong to the installation, not to any one business.
 *
 * Our Apple push key, our Meta app, our cron secret. A tenant never sets or
 * sees these, and scoping them per tenant would mean the platform's own
 * credentials disappearing the moment a request arrives without a workspace.
 * Everything else — WhatsApp tokens, gateway keys, SMTP, business details —
 * belongs to whoever configured it.
 */
const PLATFORM_KEYS = new Set([
  "meta_app_id", "meta_app_secret", "meta_config_id", "meta_business_id",
  "meta_graph_version",
  // Facebook Page connect (Social Automation) reuses meta_app_id/secret above
  // — same identity as Embedded Signup, just a different scope and redirect.
  // Instagram Login for Business is its own product/app id in the same Meta
  // Developer app, and is equally the installation's own, not a tenant's.
  "meta_instagram_app_id", "meta_instagram_app_secret", "social_webhook_verify_token",
  // The platform's own merchant account, which collects subscription fees.
  // A tenant must never see or set these: they decide where our revenue
  // lands, and a customer who could edit them could redirect it.
  "platform_active_gateway",
  "platform_paymob_api_key", "platform_paymob_public_key",
  "platform_paymob_hmac_secret", "platform_paymob_region",
  "platform_paymob_integration_id_card", "platform_paymob_integration_id_wallet",
  "platform_paymob_mode",
  "platform_amwalpay_merchant_id", "platform_amwalpay_terminal_id",
  "platform_amwalpay_secure_key", "platform_amwalpay_mode",
  // Mail goes out through the installation's own server, under its domain and
  // its reputation. A tenant setting its own SMTP would be sending from an
  // address we vouch for through a server we do not control, and one bad
  // sender would take the whole installation's deliverability with it.
  "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from",
  "smtp_allow_self_signed",
  // Web push is registered to the platform's own OneSignal application.
  "onesignal_app_id", "onesignal_safari_id", "onesignal_rest_key",
  /*
   * The Google application, as distinct from a business's Google account.
   *
   * The client id and secret identify this platform to Google and are what a
   * tenant's Connect button authorises against. A tenant registering its own
   * Google project to use the calendar would be doing our integration work for
   * us, badly; what they connect is their account, and the token for that is
   * theirs and stays in their workspace.
   */
  "google_oauth_client_id", "google_oauth_client_secret",
  "google_service_account", "google_calendar_id",
  // The address this installation answers on.
  "base_url",
  // Invoice issuer details & signature are platform-wide, not tenant-specific.
  "invoice_company_name", "invoice_company_tagline", "invoice_company_email",
  "invoice_company_phone", "invoice_company_address", "invoice_company_website",
  "invoice_signature_url", "invoice_signatory_name",
])

export function isPlatformKey(key: string): boolean {
  return PLATFORM_KEYS.has(key)
}

/**
 * Which tenant a setting is read for, or null for a platform one.
 *
 * Outside a request — a cron job, a script — there is no tenant in scope and
 * the platform row is used. That is correct for the keys that are ours and
 * wrong for the keys that are theirs, which is why background work that acts
 * for a business has to enter that business's tenant first.
 */
function scopeFor(key: string): string {
  if (PLATFORM_KEYS.has(key)) return PLATFORM
  return currentTenant()?.tenantId ?? PLATFORM
}

export function isKnownConfigKey(key: string): boolean {
  return ALL_FIELDS.has(key)
}

export function isSecretConfigKey(key: string): boolean {
  return ALL_FIELDS.get(key)?.secret === true
}

/**
 * Every setting, as the caller may see it.
 *
 * A business sees its own values and nothing else. It used to inherit the
 * installation's row and then the environment, which put our merchant account,
 * our calendar and our connected Google address into a customer's settings
 * screen — filled in, labelled "from environment", and ready to be saved by
 * somebody who assumed it was theirs. A tenant with nothing configured sees
 * nothing configured.
 *
 * The installation's own settings still inherit the environment, because
 * that is where a deployment's defaults belong.
 */
export async function getConfigValues(): Promise<Record<string, { value: string; source: "db" | "env" | "unset" }>> {
  const tenantId = currentTenant()?.tenantId ?? PLATFORM
  const isPlatform = tenantId === PLATFORM

  let rows: { key: string; value: string; tenantId: string }[] = []
  try {
    rows = await db.systemSetting.findMany({
      where: { key: { in: [...ALL_FIELDS.keys()] }, tenantId },
      select: { key: true, value: true, tenantId: true },
    })
  } catch (error) {
    console.error("Could not load settings:", error)
  }
  const byKey = new Map<string, string>()
  for (const row of rows) byKey.set(row.key, decryptSecret(row.value))

  const out: Record<string, { value: string; source: "db" | "env" | "unset" }> = {}
  for (const [key, field] of ALL_FIELDS) {
    const dbValue = byKey.get(key) || ""
    // Platform keys are the installation's wherever they are read from, so
    // they keep their environment default even inside a workspace.
    const envValue = isPlatform || PLATFORM_KEYS.has(key) ? process.env[field.envVar] || "" : ""
    out[key] = dbValue
      ? { value: dbValue, source: "db" }
      : envValue
        ? { value: envValue, source: "env" }
        : { value: "", source: "unset" }
  }
  return out
}

/**
 * One setting, for whoever is asking.
 *
 * A business's value or nothing. There is no falling back to the
 * installation's: a gateway, a calendar or a connected Google account that a
 * tenant did not set up is not theirs to use, and quietly lending them ours
 * means their customers' payments arriving in our merchant account.
 *
 * A platform key is the installation's wherever it is read, so it keeps both
 * the shared row and the environment default behind it.
 */
export async function getConfigValue(key: string): Promise<string> {
  const field = ALL_FIELDS.get(key)
  if (!field) return ""
  const tenantId = scopeFor(key)
  const isPlatform = tenantId === PLATFORM

  try {
    const own = await db.systemSetting.findUnique({
      where: { tenantId_key: { tenantId, key } },
      select: { value: true },
    })
    if (own?.value) return decryptSecret(own.value)
  } catch {
    /* fall through */
  }

  return isPlatform ? process.env[field.envVar] || "" : ""
}

export async function saveConfigValues(values: Record<string, string>): Promise<string[]> {
  const saved: string[] = []
  for (const [key, raw] of Object.entries(values)) {
    if (!isKnownConfigKey(key)) continue
    const value = String(raw ?? "").trim()
    // An empty submission leaves the stored value alone, so a form showing a
    // masked secret can be saved without wiping it. Clearing is explicit.
    if (!value) continue
    // A credential is encrypted before it touches the column, so a database
    // dump on its own is not enough to use it.
    const stored = isSecretConfigKey(key) ? encryptSecret(value) : value
    const tenantId = scopeFor(key)
    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { value: stored, type: "STRING", category: "INTEGRATION" },
      create: { tenantId, key, value: stored, type: "STRING", category: "INTEGRATION" },
    })
    saved.push(key)
  }
  return saved
}

export async function clearConfigValue(key: string): Promise<void> {
  if (!isKnownConfigKey(key)) return
  // Only the caller's own value. Clearing a field in one workspace must not
  // clear it in another, or in the platform defaults beneath them.
  await db.systemSetting.deleteMany({ where: { key, tenantId: scopeFor(key) } })
}


/**
 * The name to put in front of a customer.
 *
 * Hardcoding one business's name was correct exactly once. Every message this
 * platform sends — a sign-in code, a cart reminder, a footer under a template
 * — went out saying "Oman Adventures" regardless of who sent it, which for a
 * second business is not a cosmetic problem: their customer receives a code
 * apparently from a company they have never dealt with, and ignores it.
 *
 * Falls back to the platform's own name rather than to an empty string, so a
 * message never reads "Your  verification code".
 */
export async function businessName(): Promise<string> {
  return (await getConfigValue("business_name")) || "Fizmoh"
}

/** The public address to build customer links against. */
export async function publicBaseUrl(): Promise<string> {
  return (
    (await getConfigValue("base_url")) ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://app.fizmoh.cloud"
  ).replace(/\/+$/, "")
}
