import AppShell from "@/components/app-shell"

export default async function PlatformCatchAllPage({
  params,
}: {
  params: Promise<{ section?: string[] }>
}) {
  await params
  return <AppShell adminEntry initialView="platform" />
}

export async function generateMetadata() {
  return { title: "Fizmoh Platform Control" }
}
