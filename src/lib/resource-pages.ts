export type ResourcePage = {
  slug: string
  title: string
  description: string
  sections: { title: string; body: string; href?: string; label?: string }[]
  support?: boolean
}

export const RESOURCE_PAGES: ResourcePage[] = [
  { slug: "knowledgebase", title: "Fizmoh knowledgebase", description: "Start with a channel, build a conversation flow, and bring your team into one workspace.", sections: [
    { title: "Connect your business", body: "Use your workspace channel settings to connect an approved business account. WhatsApp templates require Meta approval; free-form replies depend on the active messaging window.", href: "/whatsapp-business-api-oman", label: "WhatsApp setup overview" },
    { title: "Build and test a flow", body: "Start with a welcome message, collect the information you need, and add a handoff. Test each choice in the simulator before publishing.", href: "/product/botflow-studio", label: "Explore the flow builder" },
    { title: "Work as a team", body: "Assign conversations, leave private notes, and review the transcript before replying. A human handoff helps customers reach the right person.", href: "/product/team-inbox", label: "Team inbox guide" },
    { title: "Troubleshoot a problem", body: "Include the affected page, time, channel and steps to reproduce. Never share passwords, verification codes or API keys.", href: "/resources/support", label: "Get technical support" },
  ] },
  { slug: "support", title: "Technical support", description: "Get AI help, create a support ticket, or ask the platform team to take over your conversation.", support: true, sections: [
    { title: "Start a conversation", body: "Open the support chat and enter your name and international phone number. Ask the AI assistant a question or select Talk to human for the platform support team." },
    { title: "Create a ticket", body: "Choose Create a support ticket in the widget, then enter a subject and description. Keep your ticket reference and return in the same browser to see replies." },
    { title: "Help us investigate", body: "Share the page URL, approximate time, expected result and actual result. Remove customer details and credentials from screenshots or error messages." },
  ] },
  { slug: "bug-report", title: "Report a bug", description: "Give the support team a reproducible example so they can investigate the right problem.", support: true, sections: [
    { title: "Describe the issue", body: "Use a ticket subject such as Bug: inbox reply failed. Include the page, browser or app version, channel, and the time the issue occurred." },
    { title: "List the steps", body: "Explain what you clicked, what you expected, and what happened instead. Say whether the issue repeats and whether it affects one item or several." },
    { title: "Track the response", body: "Submit through Create a support ticket in the widget. The reference identifies your request; the same browser shows public replies from the platform team." },
  ] },
  { slug: "feature-request", title: "Request a feature", description: "Tell us what your team needs to accomplish and where the current workflow gets in the way.", support: true, sections: [
    { title: "Start with the task", body: "Describe who needs the feature and the outcome they need. A concrete example helps more than a list of interface changes." },
    { title: "Explain the impact", body: "Include how often the task occurs, the current workaround, and any channel or integration involved. Avoid including private customer records." },
    { title: "Send your proposal", body: "Create a support ticket with Feature request in the subject. The team can ask follow-up questions there. Submission does not promise a release date." },
  ] },
  { slug: "community", title: "Community & feedback", description: "Share practical workflows and product feedback with the Fizmoh team.", support: true, sections: [
    { title: "Share a workflow", body: "Tell us how your business uses conversations, bookings or payments. Send a summary through support without exposing customer information." },
    { title: "Suggest an improvement", body: "Explain the task you want to make easier and the result you need.", href: "/resources/feature-request", label: "Submit a feature request" },
    { title: "Learn from product updates", body: "Read the published release notes and guides. This page is a direct feedback hub; it does not host public forum threads.", href: "/whats-new", label: "Read product updates" },
  ] },
  { slug: "tutorials", title: "Product tutorials", description: "Practice a bot conversation and follow guided learning paths for your team.", sections: [
    { title: "Try an interactive conversation", body: "Explore a working bot example, choose its buttons and follow the conversation to see how a flow behaves.", href: "/product/simulator", label: "Open the interactive simulator" },
    { title: "Learn automation basics", body: "Plan the questions, choices and human handoff before publishing a flow. Review how the visual builder connects each step.", href: "/product/botflow-studio", label: "Explore Botflow Studio" },
    { title: "Arrange a guided walkthrough", body: "Book a demonstration for your use case. Published video lessons are not currently available here; the simulator and live walkthrough are available learning options.", href: "/book-demo", label: "Book a product walkthrough" },
  ] },
  { slug: "woocommerce", title: "WooCommerce integration", description: "Connect store events with customer conversations and follow-up workflows.", sections: [
    { title: "Prepare the store connection", body: "Use your workspace integration settings and the store's webhook configuration. Keep credentials private and confirm the destination and signing configuration before enabling events." },
    { title: "Choose useful events", body: "Start with an order update or customer support workflow. Test with a controlled order before enabling broader automation, and avoid duplicate notifications." },
    { title: "Plan WhatsApp messages", body: "Obtain the customer's opt-in and use an approved template when required. Review the developer documentation for supported endpoints and webhook details.", href: "/docs", label: "Read integration documentation" },
    { title: "Explore store workflows", body: "See how shared support and commerce conversations fit into an online store.", href: "/solutions/ecommerce-online-stores", label: "E-commerce solutions" },
  ] },
  { slug: "priority-support", title: "Priority support", description: "Discuss your business support requirements with the platform team.", support: true, sections: [
    { title: "Explain your requirements", body: "Tell us your operating hours, channels, team size and the business impact of an interruption. The team can review which support arrangement fits." },
    { title: "Escalate an active issue", body: "Include your existing ticket reference and explain the impact in the support chat. Reuse the existing conversation where possible so the investigation stays together." },
    { title: "Confirm coverage", body: "Response targets, availability and escalation arrangements depend on your agreement. Contact the team to confirm coverage; this page does not promise a response time.", href: "/pricing", label: "View subscription plans" },
  ] },
  { slug: "website-chat", title: "Website chat", description: "Bring website enquiries into a conversation with your business.", sections: [
    { title: "Capture an enquiry", body: "Configure your workspace widget with your business identity and contact fields, then install its embed script on the intended website." },
    { title: "Offer chat and WhatsApp", body: "Visitors can use web chat or open WhatsApp when enabled in your widget settings. Review the greeting and contact number before publishing." },
    { title: "Hand over to your team", body: "Use the live inbox to review the conversation and respond. Configure AI and human handoff for the customer experience you need.", href: "/product/team-inbox", label: "Explore the team inbox" },
  ] },
  { slug: "telegram", title: "Telegram integration enquiries", description: "Check Telegram requirements with the team before planning a deployment.", support: true, sections: [
    { title: "Confirm channel availability", body: "The current visual flow engine supports WhatsApp, Facebook Messenger and Instagram. Telegram is not part of that supported channel set." },
    { title: "Describe your use case", body: "Share whether you need direct messages, groups, broadcasts or a bot integration. The team can assess the requirement without assuming existing flow compatibility." },
    { title: "Explore supported channels", body: "For a currently supported social messaging workflow, review Facebook and Instagram automation.", href: "/product/facebook-instagram-automation", label: "Supported social automation" },
  ] },
]
