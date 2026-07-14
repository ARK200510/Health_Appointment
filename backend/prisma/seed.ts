import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await hashPassword('Admin@123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@healthcare.app' },
    update: {},
    create: {
      email: 'admin@healthcare.app',
      password: adminPassword,
      role: Role.ADMIN,
      isVerified: true,
      admin: {
        create: { firstName: 'System', lastName: 'Admin' },
      },
    },
  });

  const doctorPassword = await hashPassword('Doctor@123');
  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@healthcare.app' },
    update: {},
    create: {
      email: 'doctor@healthcare.app',
      password: doctorPassword,
      role: Role.DOCTOR,
      isVerified: true,
      doctor: {
        create: {
          firstName: 'Sarah',
          lastName: 'Mitchell',
          specialization: 'General Medicine',
          qualification: 'MD, MBBS',
          experience: 12,
          bio: 'Experienced general physician with focus on preventive care.',
          phone: '+1234567890',
          consultationFee: 75,
          slotDuration: 30,
          rating: 4.8,
          totalReviews: 156,
        },
      },
    },
    include: { doctor: true },
  });

  const specializations = [
    { firstName: 'James', lastName: 'Chen', specialization: 'Cardiology', fee: 120 },
    { firstName: 'Emily', lastName: 'Rodriguez', specialization: 'Dermatology', fee: 90 },
    { firstName: 'Michael', lastName: 'Patel', specialization: 'Orthopedics', fee: 100 },
    { firstName: 'Lisa', lastName: 'Thompson', specialization: 'Pediatrics', fee: 80 },
  ];

  for (const doc of specializations) {
    const email = `${doc.firstName.toLowerCase()}@healthcare.app`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: doctorPassword,
        role: Role.DOCTOR,
        isVerified: true,
        doctor: {
          create: {
            firstName: doc.firstName,
            lastName: doc.lastName,
            specialization: doc.specialization,
            qualification: 'MD',
            experience: 8,
            consultationFee: doc.fee,
            slotDuration: 30,
            rating: 4.5 + Math.random() * 0.5,
          },
        },
      },
    });
  }

  const patientPassword = await hashPassword('Patient@123');
  await prisma.user.upsert({
    where: { email: 'patient@healthcare.app' },
    update: {},
    create: {
      email: 'patient@healthcare.app',
      password: patientPassword,
      role: Role.PATIENT,
      isVerified: true,
      patient: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1987654321',
          gender: 'Male',
          bloodGroup: 'O+',
        },
      },
    },
  });

  const doctors = await prisma.doctor.findMany();
  for (const doctor of doctors) {
    for (let day = 1; day <= 5; day++) {
      await prisma.workingHours.upsert({
        where: { doctorId_dayOfWeek: { doctorId: doctor.id, dayOfWeek: day } },
        update: {},
        create: {
          doctorId: doctor.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
        },
      });
    }
  }

  await prisma.systemConfig.upsert({
    where: { key: 'SLOT_HOLD_DURATION' },
    update: { value: '10' },
    create: { key: 'SLOT_HOLD_DURATION', value: '10' },
  });

  console.log('Seed completed!');
  console.log('Admin: admin@healthcare.app / Admin@123');
  console.log('Doctor: doctor@healthcare.app / Doctor@123');
  console.log('Patient: patient@healthcare.app / Patient@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
