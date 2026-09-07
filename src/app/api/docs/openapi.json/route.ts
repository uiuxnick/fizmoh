import { NextResponse } from "next/server"

export async function GET() {
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Fizmoh Cloud API",
      version: "2.8.0",
      description:
        "Official REST API for Fizmoh Cloud — Omnichannel WhatsApp Commerce, Multi-Tenant Automation, Tours, CRM, Healthcare & Payments.",
      contact: {
        name: "Fizmoh API Support",
        email: "support@fizmoh.cloud",
        url: "https://app.fizmoh.cloud/docs",
      },
    },
    servers: [
      {
        url: "https://app.fizmoh.cloud/api",
        description: "Production API Server",
      },
    ],
    security: [
      {
        ApiKeyAuth: [],
      },
      {
        BearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Live Workspace API Key (starts with fiz_live_...)",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Bearer Authorization Token",
        },
      },
      schemas: {
        SendMessageRequest: {
          type: "object",
          required: ["phone"],
          properties: {
            phone: { type: "string", example: "+96898821965", description: "E.164 phone number" },
            type: {
              type: "string",
              enum: ["text", "image", "document", "video", "audio", "template", "interactive", "cta_url"],
              default: "text",
            },
            text: { type: "string", example: "Hello from Fizmoh API!" },
            mediaUrl: { type: "string", example: "https://example.com/voucher.pdf" },
            caption: { type: "string", example: "Your booking confirmation" },
            templateName: { type: "string", example: "booking_confirmed" },
            language: { type: "string", default: "en_US" },
            variables: { type: "array", items: { type: "string" }, example: ["Ahmed", "OMR 45.00"] },
          },
        },
        Customer: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            phone: { type: "string" },
            email: { type: "string" },
            stage: { type: "string", enum: ["NEW", "ENGAGED", "QUALIFIED", "CUSTOMER", "REPEAT", "LOST"] },
            tags: { type: "array", items: { type: "string" } },
            whatsappOptIn: { type: "boolean" },
          },
        },
        Order: {
          type: "object",
          properties: {
            id: { type: "string" },
            orderNumber: { type: "string", example: "ORD-98214" },
            totalAmount: { type: "number", example: 35.5 },
            currency: { type: "string", example: "OMR" },
            paymentStatus: { type: "string", enum: ["PENDING", "PAID", "REFUNDED", "FAILED"] },
            orderStatus: { type: "string", enum: ["CONFIRMED", "CANCELLED", "COMPLETED"] },
          },
        },
      },
    },
    paths: {
      "/external/v1/whatsapp/send": {
        post: {
          summary: "Send WhatsApp Message",
          description: "Sends a real-time text, media, template, or interactive message to a customer.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SendMessageRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Message accepted for delivery",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      messageId: { type: "string" },
                      status: { type: "string", example: "ACCEPTED" },
                    },
                  },
                },
              },
            },
            400: { description: "Invalid payload parameters" },
            401: { description: "Unauthorized: Missing or invalid API key" },
          },
        },
      },
      "/external/v1/whatsapp/templates": {
        get: {
          summary: "List WhatsApp Templates",
          description: "Returns all approved Meta templates configured for the workspace.",
          responses: {
            200: { description: "List of WhatsApp templates" },
          },
        },
      },
      "/external/v1/whatsapp/broadcast": {
        post: {
          summary: "Trigger Template Broadcast",
          description: "Dispatches a batch template message to up to 500 phone numbers.",
          responses: {
            200: { description: "Broadcast delivery summary" },
          },
        },
      },
      "/external/v1/customers": {
        get: {
          summary: "List & Search Contacts",
          description: "Search CRM contacts by phone, name, email, or lifecycle stage.",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" }, description: "Search query" },
            { name: "stage", in: "query", schema: { type: "string" }, description: "Filter by pipeline stage" },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: {
            200: { description: "Paginated contact records" },
          },
        },
        post: {
          summary: "Create or Upsert Contact",
          description: "Creates a new contact or updates an existing contact matched by phone number.",
          responses: {
            200: { description: "Customer created or updated" },
          },
        },
      },
      "/external/v1/customers/{id}": {
        get: {
          summary: "Get Contact Details",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Contact record" } },
        },
        patch: {
          summary: "Update Contact",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Updated contact" } },
        },
        delete: {
          summary: "Delete Contact",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Contact deleted" } },
        },
      },
      "/external/v1/orders": {
        get: {
          summary: "List Orders",
          description: "Query bookings and orders with status and date filters.",
          responses: { 200: { description: "Order listing" } },
        },
        post: {
          summary: "Create Order",
          description: "Creates an order and returns an instant customer checkout payment link.",
          responses: { 200: { description: "Order created with checkoutUrl" } },
        },
      },
      "/external/v1/webhooks": {
        get: {
          summary: "List Webhook Subscriptions",
          responses: { 200: { description: "Subscribed webhooks" } },
        },
        post: {
          summary: "Register Webhook Subscription",
          description: "Registers an HTTPS webhook endpoint with an HMAC secret.",
          responses: { 200: { description: "Webhook registered" } },
        },
      },
    },
  }

  return NextResponse.json(openApiSpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
