import { validateAdditionalDates } from "@/lib/course-schedule"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { raw } from "@/lib/db"
import { getCourseByIdOrSlug, type Course } from "@/lib/training-service"
import { PLATFORM } from "@/lib/tenant"
import { modulesFor } from "@/lib/entitlements"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ reg?: string; src?: string; workspace?: string; tenantId?: string }>
}

async function publicCourse(slug: string, query: Awaited<PageProps["searchParams"]>): Promise<Course | null> {
  if (!query.workspace && !query.tenantId) {
    const course = await getCourseByIdOrSlug(PLATFORM, slug)
    return course?.landingPageEnabled && course.status !== "DRAFT" ? course : null
  }
  const tenant = await raw.tenant.findUnique({
    where: query.workspace ? { slug: query.workspace } : { id: query.tenantId! }, select: { id: true },
  })
  if (!tenant) return null

  const modules = await modulesFor(tenant.id)
  if (!modules.includes("TRAINING")) return null

  const setting = await raw.systemSetting.findUnique({ where: { tenantId_key: { tenantId: tenant.id, key: "training_course_catalog" } }, select: { value: true } })
  if (!setting?.value) return null
  try {
    const courses: Course[] = JSON.parse(setting.value)
    if (!Array.isArray(courses)) return null
    const course = courses.find(c => c.id === slug || c.slug === slug || c.courseId === slug)
    if (!course?.landingPageEnabled || course.status === "DRAFT") return null
    const dates = await raw.systemSetting.findUnique({ where: { tenantId_key: { tenantId: tenant.id, key: `training_course_dates:${course.id}` } }, select: { value: true } })
    return { ...course, tenantId: tenant.id, ...(dates?.value ? { additionalDates: validateAdditionalDates(JSON.parse(dates.value)) } : {}) }
  } catch { return null }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const course = await publicCourse(slug, await searchParams)

  if (!course) {
    return {
      title: "Course Not Found | Fizmoh Training",
    }
  }

  return {
    title: `${course.name} | ${course.trainerCompany || "Executive Masterclass"}`,
    description: course.description.slice(0, 160),
    openGraph: {
      title: course.name,
      description: `${course.duration} Masterclass with ${course.trainerName}. ${course.offerTitle || "Register now!"}`,
      images: course.bannerUrl ? [{ url: course.bannerUrl }] : undefined,
    },
  }
}

export default async function TrainingCourseLandingPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { reg, src } = await searchParams

  const course = await publicCourse(slug, await searchParams)
  if (!course || !course.landingPageEnabled) {
    notFound()
  }

  const tenant = await raw.tenant.findUnique({ where: { id: course.tenantId }, select: { slug: true } })
  if (!tenant) notFound()
  const query = new URLSearchParams()
  if (reg) query.set("reg", reg)
  if (src) query.set("src", src)
  redirect(`/${encodeURIComponent(tenant.slug)}/courses/${encodeURIComponent(course.id)}${query.size ? `?${query}` : ""}`)
}
