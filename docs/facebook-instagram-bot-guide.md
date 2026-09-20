# Facebook and Instagram bots

## Shared Bot & Automation builder

Open **Bot & Automation** and select **WhatsApp**, **Facebook** or **Instagram**. Each tab shows that channel's flows and actual conversation run history. New Flow, AI drafting, diagram/JSON import, templates, the visual editor, simulator and publishing use the same builder. New flows inherit the selected tab. Expand **bot settings & reply test** inside a social tab to manage its automation and preview answers. WhatsApp-specific steps are disabled on social channels, and the template gallery filters to compatible steps.

## Tenant setup

1. Open Settings → Facebook & Instagram → Connect Accounts. Connect the workspace's own Facebook Page and Instagram professional account, then select the active account for each channel.
2. Open Knowledge Base and add accurate FAQs, policies, products and contact details. In each channel's settings, add business information, tone, fallback text and handoff keywords. Never put passwords or private customer records in bot instructions.
3. Start with approval required. Use **Test bot reply** in the channel settings to preview an answer without messaging a customer. Test a known question, an unknown question and a request for a person.
4. For a guided bot, open Bot & Automation, create a flow and choose **Facebook & Instagram — Knowledge bot**. The template is saved inactive. Select the intended channels, inspect the AI and handoff steps, then save and publish when ready. Existing flows without channel selections remain WhatsApp-only.
5. To enable automatic replies, enable the channel and DM replies, select Automatic, confirm the owner acknowledgement and turn off approval required. Leave approval on if staff should review AI drafts. Guided social flows run only in approved automatic mode.
6. Test by messaging the connected account from a separate customer account. Confirm the reply arrives, then ask for a human and verify the conversation pauses for staff. Resume automation only after the issue is resolved.

The knowledge template handles DMs. Comment automation is configured separately in the channel settings. Social choice nodes send numbered text options. WhatsApp-specific booking, payment, template and delay nodes are unavailable in social flows. Guided flow steps execute immediately; the channel reply-delay setting applies to ordinary canned/AI and comment replies, which are queued durably.

## Administrator setup and operation

1. Configure the existing Facebook and Instagram Login credentials in platform settings. Keep secrets encrypted through the existing secret-box helpers. Use the Instagram-specific app ID and secret for Instagram Login.
2. Verify the OAuth redirects and webhook URLs for this domain, required product permissions and connected-account status in Meta's dashboard. Testing access and production access for customer accounts are separate checks; an owner test alone does not establish SaaS readiness.
3. Verify the platform AI provider and allow the workspace the Social Inbox and Flows modules. Preview uses the workspace's business information and knowledge search.
4. Apply the additive migration in `scripts/sql/bot-automation-additive.sql` before deploying this release. Back up the database first. It creates three tables and their indexes; it does not replace existing tables or data.
5. Deploy using `bash scripts/ship.sh <changed files>`. Confirm TypeScript, tests, production build and the three health checks succeed. Application logs are under `/home/fizmoh-platform/logs/` and service is `wptour`.
6. The existing authenticated cron endpoint processes `social_replies`, `scheduled_bot_flows`, `delayed_flows` and `bot_maintenance`. Queue delays are minimum delays, rounded up to the next cron run (the active wptour timer runs every five minutes). Do not run all cron jobs just to test a bot. A specific job can be selected with `?job=social_replies` using the existing cron authentication.
7. Review failed messages in Settings → Facebook & Instagram → Logs & Errors, and flow run history. An interrupted social send is marked UNKNOWN and is not automatically retried; check actual delivery before manually retrying. Handoff pauses the bot. Drafts require staff approval.

Scheduled flows currently run once for up to 100 explicitly selected WhatsApp conversations, only within the customer reply window. Paused or busy conversations are skipped. Schedules older than 24 hours are not replayed after downtime. Seat holds are durable and expire through maintenance; historical holds created before this release are not silently deleted.

## App review description and demonstration checklist

Suggested description: “Fizmoh is a multi-tenant customer support SaaS. Each business connects its own Facebook Page or Instagram professional account through Meta Login. Authorized staff receive messages in a shared inbox, draft or send replies, and optionally enable a knowledge-based support bot. The bot answers from that business's information and pauses for staff when a customer requests a person or the answer is unavailable. Businesses control automation independently and can disconnect their accounts.”

Record a demonstration with a dedicated test business: connect the account; receive a customer DM; preview and approve an AI draft; enable automatic replies with owner acknowledgement; show a grounded answer and human handoff; show comment replies only if requesting comment permissions; disconnect. Explain each requested permission using the feature it enables. Provide reviewer login and test steps through Meta's secure review form. Verify current permission/access requirements in Meta's dashboard before submission. This release does not submit an app review or change Meta permissions.
