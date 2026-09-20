const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

const TENANT = "cmsqevt2a0000i3g24a2qc10w"

async function main() {
  console.log("Seeding Kauvery Hospital...")

  // Hospital settings
  await db.hospSettings.upsert({
    where: { tenantId: TENANT },
    create: { tenantId: TENANT, hospitalName: "Kauvery Hospital", sessionMode: "SESSION", holdDurationMins: 5 },
    update: { hospitalName: "Kauvery Hospital" }
  })

  // Departments
  const depts = [
    { name: "Medical Oncology", sortOrder: 1 },
    { name: "Surgical Oncology", sortOrder: 2 },
    { name: "Radiation Oncology", sortOrder: 3 },
    { name: "Hematology", sortOrder: 4 },
    { name: "General Medicine", sortOrder: 5 },
  ]
  const deptMap = {}
  for (const d of depts) {
    const existing = await db.hospDepartment.findFirst({ where: { tenantId: TENANT, name: d.name } })
    if (existing) { deptMap[d.name] = existing.id; continue }
    const rec = await db.hospDepartment.create({ data: { tenantId: TENANT, ...d } })
    deptMap[d.name] = rec.id
    console.log("Dept:", d.name)
  }

  // Doctors
  const doctors = [
    { name: "Dr. Ahmed Khan", specialization: "Medical Oncology", deptName: "Medical Oncology" },
    { name: "Dr. Sara Joseph", specialization: "Medical Oncology", deptName: "Medical Oncology" },
    { name: "Dr. Mohammed Ali", specialization: "Hematology", deptName: "Hematology" },
  ]
  for (const d of doctors) {
    const existing = await db.hospDoctor.findFirst({ where: { tenantId: TENANT, name: d.name } })
    if (existing) continue
    const rec = await db.hospDoctor.create({
      data: { tenantId: TENANT, name: d.name, specialization: d.specialization, departmentId: deptMap[d.deptName] }
    })
    console.log("Doctor:", d.name)
    // Add Sun-Thu schedule 9-13 + 14-17
    for (let day = 0; day <= 4; day++) {
      await db.hospDoctorSchedule.createMany({
        data: [
          { doctorId: rec.id, dayOfWeek: day, startTime: "09:00", endTime: "13:00", appointmentDuration: 30 },
          { doctorId: rec.id, dayOfWeek: day, startTime: "14:00", endTime: "17:00", appointmentDuration: 30 },
        ]
      })
    }
  }

  // Wards
  let normalWard = await db.hospWard.findFirst({ where: { tenantId: TENANT, wardType: "NORMAL" } })
  if (!normalWard) {
    normalWard = await db.hospWard.create({ data: { tenantId: TENANT, name: "Normal Ward", wardType: "NORMAL", totalBeds: 15 } })
    console.log("Normal Ward created")
  }
  let specialWard = await db.hospWard.findFirst({ where: { tenantId: TENANT, wardType: "SPECIAL" } })
  if (!specialWard) {
    specialWard = await db.hospWard.create({ data: { tenantId: TENANT, name: "Special Ward", wardType: "SPECIAL", totalBeds: 15 } })
    console.log("Special Ward created")
  }

  // Normal beds N01-N15
  for (let i = 1; i <= 15; i++) {
    const num = "N" + String(i).padStart(2, "0")
    const existing = await db.hospBed.findFirst({ where: { tenantId: TENANT, bedNumber: num } })
    if (!existing) {
      await db.hospBed.create({ data: { tenantId: TENANT, wardId: normalWard.id, bedNumber: num } })
    }
  }
  console.log("Normal beds N01-N15 created")

  // Special beds S01-S15
  for (let i = 1; i <= 15; i++) {
    const num = "S" + String(i).padStart(2, "0")
    const existing = await db.hospBed.findFirst({ where: { tenantId: TENANT, bedNumber: num } })
    if (!existing) {
      await db.hospBed.create({ data: { tenantId: TENANT, wardId: specialWard.id, bedNumber: num } })
    }
  }
  console.log("Special beds S01-S15 created")

  // Treatment sessions
  const sessions = [
    { name: "Morning Session", startTime: "08:00", endTime: "12:00", sortOrder: 1 },
    { name: "Afternoon Session", startTime: "12:30", endTime: "16:30", sortOrder: 2 },
    { name: "Evening Session", startTime: "17:00", endTime: "20:00", sortOrder: 3 },
  ]
  for (const s of sessions) {
    const existing = await db.hospTreatmentSession.findFirst({ where: { tenantId: TENANT, name: s.name } })
    if (!existing) {
      await db.hospTreatmentSession.create({ data: { tenantId: TENANT, ...s } })
      console.log("Session:", s.name)
    }
  }

  // Create sample patient John Mathew (MRN10458)
  const existingPt = await db.hospPatient.findFirst({ where: { tenantId: TENANT, mrn: "MRN10458" } })
  if (!existingPt) {
    await db.hospPatient.create({
      data: {
        tenantId: TENANT,
        mrn: "MRN10458",
        fullName: "John Mathew",
        mobile: "+96891234567",
        email: "john.mathew@example.com",
      }
    })
    console.log("Sample patient John Mathew created (MRN10458)")
  }

  console.log("\n✅ Kauvery Hospital seed complete!")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
