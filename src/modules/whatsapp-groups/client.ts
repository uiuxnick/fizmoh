import { getWhatsAppConfig, GRAPH_API_VERSION, type WhatsAppConfig } from "@/lib/whatsapp"
import { GroupFeatureError, type JoinApprovalMode, type MetaGroupErrorBody } from "./types"

export interface MetaClientDeps {
  getConfig?: () => Promise<WhatsAppConfig>
  fetchImpl?: typeof fetch
  sleepImpl?: (ms: number) => Promise<void>
}

const DEFAULT_MAX_RETRIES = 3
const BASE_BACKOFF_MS = 400

function defaultSleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

function mapMetaError(status: number, body: MetaGroupErrorBody | null): GroupFeatureError {
  const err = body?.error
  const code = err?.code
  const msg = err?.message || `Meta Graph API error (${status})`

  // Common OBA / Groups API eligibility & rate limit errors
  if (code === 10 || code === 200 || code === 131000 || /official business account|oba|not eligible|permission/i.test(msg)) {
    return new GroupFeatureError(
      `WhatsApp Groups API requires an Official Business Account (OBA) on Cloud API: ${msg}`,
      403,
      code,
    )
  }
  if (status === 429 || code === 130429 || code === 80007 || code === 4) {
    return new GroupFeatureError(`Meta rate limit exceeded: ${msg}`, 429, code)
  }
  if (status >= 400 && status < 500) {
    return new GroupFeatureError(msg, status, code)
  }
  return new GroupFeatureError(msg, 502, code)
}

export function createGroupsMetaClient(deps: MetaClientDeps = {}) {
  const getConfig = deps.getConfig ?? getWhatsAppConfig
  const fetchFn = deps.fetchImpl ?? fetch
  const sleep = deps.sleepImpl ?? defaultSleep

  async function request<T = any>(
    path: string,
    options: { method?: string; body?: unknown } = {},
  ): Promise<{ data: T; config: WhatsAppConfig }> {
    const config = await getConfig()
    if (!config.accessToken || !config.phoneNumberId) {
      throw new GroupFeatureError(
        "WhatsApp Cloud API credentials (access token and phone number ID) are not configured.",
        400,
        "MISSING_CREDENTIALS",
      )
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${path.replace(/^\//, "")}`
    let lastError: GroupFeatureError | null = null

    for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt++) {
      const res = await fetchFn(url, {
        method: options.method || "GET",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      })

      let parsed: any = null
      try {
        parsed = await res.json()
      } catch {
        parsed = null
      }

      if (res.ok) {
        return { data: parsed as T, config }
      }

      lastError = mapMetaError(res.status, parsed as MetaGroupErrorBody | null)

      if (!isRetryableStatus(res.status) || attempt === DEFAULT_MAX_RETRIES) {
        throw lastError
      }

      const retryAfter = Number(res.headers.get("retry-after") || "0")
      const backoff = retryAfter > 0
        ? retryAfter * 1000
        : BASE_BACKOFF_MS * Math.pow(2, attempt)
      await sleep(backoff)
    }

    throw lastError ?? new GroupFeatureError("Unknown Meta API failure", 502)
  }

  return {
    async createGroup(params: {
      subject: string
      description?: string
      joinApprovalMode?: JoinApprovalMode
    }) {
      const config = await getConfig()
      const { data } = await request<{ id?: string; group_id?: string; invite_link?: string }>(
        `${config.phoneNumberId}/groups`,
        {
          method: "POST",
          body: {
            messaging_product: "whatsapp",
            subject: params.subject,
            ...(params.description ? { description: params.description } : {}),
            join_approval_mode: params.joinApprovalMode || "auto_approve",
          },
        },
      )
      return {
        groupId: data.group_id || data.id || "",
        inviteLink: data.invite_link || null,
        phoneNumberId: config.phoneNumberId,
      }
    },

    async deleteGroup(groupId: string) {
      const { data } = await request<{ success?: boolean }>(`${encodeURIComponent(groupId)}`, {
        method: "DELETE",
      })
      return data
    },

    async getGroupInfo(groupId: string) {
      const fields = "id,subject,description,join_approval_mode,invite_link,participants,total_participant_count"
      const { data } = await request<any>(`${encodeURIComponent(groupId)}?fields=${fields}`, {
        method: "GET",
      })
      return data
    },

    async listActiveGroups() {
      const config = await getConfig()
      const { data } = await request<{ data?: any[] }>(`${config.phoneNumberId}/groups`, {
        method: "GET",
      })
      return data?.data || []
    },

    async getInviteLink(groupId: string) {
      const { data } = await request<{ invite_link?: string }>(
        `${encodeURIComponent(groupId)}/invite_link`,
        { method: "GET" },
      )
      return data.invite_link || null
    },

    async resetInviteLink(groupId: string) {
      const { data } = await request<{ invite_link?: string }>(
        `${encodeURIComponent(groupId)}/invite_link`,
        {
          method: "POST",
          body: { messaging_product: "whatsapp" },
        },
      )
      return data.invite_link || null
    },

    async getJoinRequests(groupId: string) {
      const { data } = await request<{ data?: any[] }>(
        `${encodeURIComponent(groupId)}/join_requests`,
        { method: "GET" },
      )
      return data?.data || []
    },

    async approveJoinRequests(groupId: string, joinRequestIds: string[]) {
      const { data } = await request<{ approved_join_requests?: string[]; failed_join_requests?: any[] }>(
        `${encodeURIComponent(groupId)}/join_requests`,
        {
          method: "POST",
          body: {
            messaging_product: "whatsapp",
            join_requests: joinRequestIds,
          },
        },
      )
      return data
    },

    async rejectJoinRequests(groupId: string, joinRequestIds: string[]) {
      const { data } = await request<{ rejected_join_requests?: string[]; failed_join_requests?: any[] }>(
        `${encodeURIComponent(groupId)}/join_requests`,
        {
          method: "DELETE",
          body: {
            messaging_product: "whatsapp",
            join_requests: joinRequestIds,
          },
        },
      )
      return data
    },

    async removeParticipants(groupId: string, waIds: string[]) {
      const { data } = await request<{ removed_participants?: any[]; failed_participants?: any[] }>(
        `${encodeURIComponent(groupId)}/participants`,
        {
          method: "DELETE",
          body: {
            messaging_product: "whatsapp",
            participants: waIds.map(user => ({ user })),
          },
        },
      )
      return data
    },

    async sendGroupMessage(groupId: string, payload: Record<string, unknown>) {
      const config = await getConfig()
      const { data } = await request<{ messages?: { id: string }[] }>(
        `${config.phoneNumberId}/messages`,
        {
          method: "POST",
          body: {
            messaging_product: "whatsapp",
            recipient_type: "group",
            to: groupId,
            ...payload,
          },
        },
      )
      return { messageId: data?.messages?.[0]?.id || null, raw: data }
    },

    async sendInviteLinkTemplate(params: {
      to: string
      templateName: string
      templateLang: string
      inviteLink: string
      groupSubject: string
    }) {
      const config = await getConfig()
      const { data } = await request<{ messages?: { id: string }[] }>(
        `${config.phoneNumberId}/messages`,
        {
          method: "POST",
          body: {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: params.to,
            type: "template",
            template: {
              name: params.templateName,
              language: { code: params.templateLang },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: params.groupSubject },
                    { type: "text", text: params.inviteLink },
                  ],
                },
              ],
            },
          },
        },
      )
      return { messageId: data?.messages?.[0]?.id || null, raw: data }
    },
  }
}

export const defaultGroupsMetaClient = createGroupsMetaClient()
