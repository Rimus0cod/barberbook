import "reflect-metadata";
import { BarberEntity } from "../barbers/barber.entity";
import { ServiceEntity } from "../services/service.entity";
import { WorkScheduleEntity } from "../schedule/work-schedule.entity";
import { PaymentPolicy } from "../common/enums/payment-policy.enum";
import AppDataSource from "./data-source";

async function seedDemo() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  const barberRepository = AppDataSource.getRepository(BarberEntity);
  const serviceRepository = AppDataSource.getRepository(ServiceEntity);
  const scheduleRepository = AppDataSource.getRepository(WorkScheduleEntity);

  const demoBarbers = [
    {
      name: "Maksym",
      photoUrl:
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80",
      bio: "Classic scissor work and beard shaping.",
    },
    {
      name: "Oleh",
      photoUrl:
        "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80",
      bio: "Modern fades and texture styling.",
    },
    {
      name: "Danylo",
      photoUrl:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
      bio: "Premium grooming and detail finishing.",
    },
  ];

  const createdBarbers = await Promise.all(
    demoBarbers.map(async (barberData) => {
      const existing = await barberRepository.findOne({ where: { name: barberData.name } });
      if (existing) {
        return existing;
      }

      return barberRepository.save(barberRepository.create(barberData));
    }),
  );

  const demoServices = [
    { name: "Classic Cut", description: "Signature cut and finish", price: "400.00", durationMin: 45, paymentPolicy: PaymentPolicy.DepositPercent, depositValue: "50" },
    { name: "Beard Trim", description: "Shape and line detail", price: "250.00", durationMin: 30, paymentPolicy: PaymentPolicy.DepositPercent, depositValue: "50" },
    { name: "Premium Grooming", description: "Full service with wash and finish", price: "650.00", durationMin: 75, paymentPolicy: PaymentPolicy.DepositPercent, depositValue: "50" },
  ];

  await Promise.all(
    demoServices.map(async (serviceData) => {
      const existing = await serviceRepository.findOne({ where: { name: serviceData.name } });
      if (!existing) {
        await serviceRepository.save(serviceRepository.create(serviceData));
      }
    }),
  );

  for (const barber of createdBarbers) {
    const existingDays = await scheduleRepository.find({ where: { barberId: barber.id } });
    if (existingDays.length > 0) {
      continue;
    }

    const days = [1, 2, 3, 4, 5];
    const entries = days.map((dayOfWeek) =>
      scheduleRepository.create({
        barberId: barber.id,
        dayOfWeek,
        startTime: "09:00:00",
        endTime: "18:00:00",
        isDayOff: false,
      }),
    );

    await scheduleRepository.save(entries);
  }

  console.log("Demo data ready");
  await AppDataSource.destroy();
}

seedDemo().catch((error) => {
  console.error(error);
  process.exit(1);
});
