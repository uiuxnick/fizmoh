from pathlib import Path

p = Path('/home/fizmoh-platform/current/src/components/views/whatsapp-accounts-view.tsx')
s = p.read_text()
old = '''            mode: "embedded",
            code,
            wabaId: session?.waba_id,'''
new = '''            mode: "embedded",
            code,
            accessToken,
            wabaId: session?.waba_id,'''
if old in s:
    s = s.replace(old, new, 1)
p.write_text(s)

p = Path('/home/fizmoh-platform/current/src/app/api/whatsapp/accounts/route.ts')
s = p.read_text()
old = '  code: z.string().trim().min(10).max(1000),'
new = '''  // Meta normally returns a short-lived signup code. Some valid Wptour
  // configurations return the already-authorized access token instead.
  code: z.string().trim().min(10).max(1000).optional(),
  accessToken: z.string().trim().min(20).max(500).optional(),'''
if old in s:
    s = s.replace(old, new, 1)
old = '''  coexistence: z.boolean().optional(),
})'''
new = '''  coexistence: z.boolean().optional(),
}).refine(value => !!value.code || !!value.accessToken, {
  message: "A signup code or access token is required",
})'''
if old in s:
    s = s.replace(old, new, 1)
old = '''    // The code expires in thirty seconds, so nothing else happens first.
    const exchanged = await exchangeCode(body.code)
    if (!exchanged.ok || !exchanged.token) {
      return NextResponse.json({ error: exchanged.error || "That sign-up could not be completed" }, { status: 502 })
    }
    token = exchanged.token'''
new = '''    if (body.code) {
      // The code expires in thirty seconds, so nothing else happens first.
      const exchanged = await exchangeCode(body.code)
      if (!exchanged.ok || !exchanged.token) {
        return NextResponse.json({ error: exchanged.error || "That sign-up could not be completed" }, { status: 502 })
      }
      token = exchanged.token
    } else {
      token = body.accessToken!
    }'''
if old in s:
    s = s.replace(old, new, 1)
p.write_text(s)
