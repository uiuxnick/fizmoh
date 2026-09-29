import { Metadata } from "next"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getCourseByIdOrSlug, getTenantCourses } from "@/lib/training-service"
import { PLATFORM } from "@/lib/tenant"
import TrainingLandingClient from "./training-landing-client"

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ reg?: string; src?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const course = await getCourseByIdOrSlug(PLATFORM, slug)

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

  const course = await getCourseByIdOrSlug(PLATFORM, slug)
  if (!course || !course.landingPageEnabled) {
    notFound()
  }

  const bankAccounts = await db.bankAccount.findMany({
    where: { tenantId: course.tenantId || undefined, isActive: true },
    orderBy: { isDefault: "desc" },
  })

  return <TrainingLandingClient course={course} registrationId={reg} initialSource={src} bankAccounts={bankAccounts} />
}
