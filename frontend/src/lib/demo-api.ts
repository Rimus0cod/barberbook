import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type {
  AdminAuditLogsResponse,
  AdminBookingsResponse,
  AdminUser,
  Barber,
  Booking,
  BookingHold,
  CheckoutSession,
  ClientUser,
  ScheduleExceptionsResponse,
  ScheduleResponse,
  Service,
  SlotsResponse,
} from "./types";

const DEMO_STORAGE_KEY = "barberbook-demo-state-v1";

const services: Service[] = [
  {
    id: "demo-service-cut",
    name: "Signature Haircut",
    description: "Consultation, tailored cut and styling.",
    price: "35.00",
    durationMin: 45,
    paymentPolicy: "deposit_percent",
    depositValue: "30",
    isActive: true,
  },
  {
    id: "demo-service-beard",
    name: "Beard Sculpt",
    description: "Shape, line-up and hot towel finish.",
    price: "24.00",
    durationMin: 30,
    paymentPolicy: "deposit_percent",
    depositValue: "30",
    isActive: true,
  },
  {
    id: "demo-service-combo",
    name: "Cut + Beard",
    description: "Complete haircut and beard service.",
    price: "52.00",
    durationMin: 75,
    paymentPolicy: "deposit_percent",
    depositValue: "30",
    isActive: true,
  },
];

const barbers: Barber[] = [
  {
    id: "demo-barber-alex",
    name: "Alex Morgan",
    bio: "Precision fades, textured cuts and clean classic shapes.",
    isActive: true,
  },
  {
    id: "demo-barber-marcus",
    name: "Marcus Reed",
    bio: "Classic barbering, beard work and relaxed modern styling.",
    isActive: true,
  },
  {
    id: "demo-barber-noah",
    name: "Noah Bennett",
    bio: "Modern cuts with a focus on natural shape and easy maintenance.",
    isActive: true,
  },
];

const demoAdmin: AdminUser = {
  id: "demo-admin",
  email: "demo@barberbook.local",
  role: "admin",
};

interface DemoState {
  holds: Record<string, BookingHold>;
  bookings: Record<string, Booking>;
  client: ClientUser | null;
  adminLoggedIn: boolean;
}

function initialState(): DemoState {
  return {
    holds: {},
    bookings: {},
    client: null,
    adminLoggedIn: false,
  };
}

function readState(): DemoState {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? { ...initialState(), ...JSON.parse(raw) } : initialState();
  } catch {
    return initialState();
  }
}

function writeState(state: DemoState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  }
}

function body<T>(config: InternalAxiosRequestConfig): T {
  if (!config.data) return {} as T;
  if (typeof config.data === "string") return JSON.parse(config.data) as T;
  return config.data as T;
}

function response<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? "OK" : "Created",
    headers: {},
    config,
  };
}

function id(prefix: string) {
  return `demo-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function serviceById(serviceId: string) {
  return services.find((item) => item.id === serviceId) ?? services[0];
}

function barberById(barberId: string) {
  return barbers.find((item) => item.id === barberId) ?? barbers[0];
}

function slotEnd(startTime: string, durationMin: number) {
  return new Date(new Date(startTime).getTime() + durationMin * 60_000).toISOString();
}

function makeSlots(date: string, barberId: string, serviceId: string): SlotsResponse {
  const service = serviceById(serviceId);
  const hours = [9, 10, 11, 13, 14, 15, 16, 17];
  return {
    date,
    barberId,
    serviceDuration: service.durationMin,
    slots: hours.map((hour) => new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`).toISOString()),
  };
}

function pagination(total: number, page = 1, limit = 20) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

export const demoAdapter: AxiosAdapter = async (config) => {
  await new Promise((resolve) => setTimeout(resolve, 120));

  const url = config.url ?? "/";
  const method = (config.method ?? "get").toLowerCase();
  const state = readState();

  if (url === "/services" && method === "get") return response(config, services);
  if (url === "/barbers" && method === "get") return response(config, barbers);

  const slotsMatch = url.match(/^\/barbers\/([^/]+)\/slots$/);
  if (slotsMatch && method === "get") {
    const params = (config.params ?? {}) as { date?: string; serviceId?: string };
    return response(
      config,
      makeSlots(
        params.date ?? new Date().toISOString().slice(0, 10),
        slotsMatch[1],
        params.serviceId ?? services[0].id,
      ),
    );
  }

  if (url === "/booking-holds" && method === "post") {
    const payload = body<{
      barberId: string;
      serviceId: string;
      clientName: string;
      clientPhone?: string;
      clientTelegramUsername?: string;
      startTime: string;
      notes?: string;
    }>(config);
    const service = serviceById(payload.serviceId);
    const barber = barberById(payload.barberId);
    const holdId = id("hold");
    const accessToken = id("token");
    const price = Number(service.price);
    const deposit = service.paymentPolicy === "deposit_percent"
      ? price * (Number(service.depositValue ?? 0) / 100)
      : service.paymentPolicy === "deposit_fixed"
        ? Number(service.depositValue ?? 0)
        : service.paymentPolicy === "full_prepayment"
          ? price
          : 0;
    const hold: BookingHold = {
      id: holdId,
      barberId: barber.id,
      serviceId: service.id,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone ?? "+380 00 000 0000",
      clientTelegramUsername: payload.clientTelegramUsername,
      startTime: payload.startTime,
      endTime: slotEnd(payload.startTime, service.durationMin),
      priceSnapshot: price.toFixed(2),
      depositAmount: deposit.toFixed(2),
      currency: "UAH",
      notes: payload.notes,
      status: "created",
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      paymentRequired: deposit > 0,
      accessToken,
      barber,
      service,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.holds[holdId] = hold;
    writeState(state);
    return response(config, hold, 201);
  }

  const holdMatch = url.match(/^\/booking-holds\/([^/]+)$/);
  if (holdMatch && method === "get") {
    return response(config, state.holds[holdMatch[1]] ?? null);
  }

  if (url === "/payments/checkout" && method === "post") {
    const payload = body<{ holdId: string; token: string }>(config);
    const hold = state.holds[payload.holdId];
    if (!hold) return response(config, null, 404);
    const paymentId = id("payment");
    hold.status = "payment_pending";
    hold.paymentProvider = "mock";
    hold.activePayment = {
      id: paymentId,
      status: "pending",
      provider: "mock",
      amount: hold.depositAmount,
      currency: hold.currency,
      createdAt: new Date().toISOString(),
    };
    writeState(state);
    const checkout: CheckoutSession = {
      holdId: hold.id,
      holdStatus: hold.status,
      expiresAt: hold.expiresAt,
      paymentRequired: hold.paymentRequired,
      provider: "mock",
      payment: hold.activePayment,
      redirect: null,
    };
    return response(config, checkout);
  }

  const mockPaymentMatch = url.match(/^\/payments\/mock\/([^/]+)\/complete$/);
  if (mockPaymentMatch && method === "post") {
    const hold = Object.values(state.holds).find(
      (item) => item.activePayment?.id === mockPaymentMatch[1],
    );
    if (!hold) return response(config, null, 404);
    if (hold.activePayment) hold.activePayment.status = "paid";
    hold.status = "converted";
    const bookingId = id("booking");
    hold.convertedBookingId = bookingId;
    const booking: Booking = {
      id: bookingId,
      bookingHoldId: hold.id,
      barberId: hold.barberId,
      serviceId: hold.serviceId,
      source: "site",
      clientName: hold.clientName,
      clientPhone: hold.clientPhone,
      clientTelegramUsername: hold.clientTelegramUsername,
      startTime: hold.startTime,
      endTime: hold.endTime,
      priceSnapshot: hold.priceSnapshot,
      depositAmount: hold.depositAmount,
      currency: hold.currency,
      paymentStatus: Number(hold.depositAmount) >= Number(hold.priceSnapshot) ? "paid" : "partially_paid",
      status: "confirmed",
      notes: hold.notes,
      managementToken: id("management"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      barber: hold.barber,
      service: hold.service,
    };
    state.bookings[bookingId] = booking;
    writeState(state);
    const checkout: CheckoutSession = {
      holdId: hold.id,
      bookingId,
      holdStatus: "converted",
      expiresAt: hold.expiresAt,
      paymentRequired: true,
      provider: "mock",
      payment: hold.activePayment,
      redirect: null,
    };
    return response(config, checkout);
  }

  const bookingMatch = url.match(/^\/bookings\/([^/]+)$/);
  if (bookingMatch && method === "get") {
    return response(config, state.bookings[bookingMatch[1]] ?? null);
  }

  const cancelMatch = url.match(/^\/bookings\/([^/]+)\/cancel$/);
  if (cancelMatch && method === "post") {
    const booking = state.bookings[cancelMatch[1]];
    if (!booking) return response(config, null, 404);
    const payload = body<{ reason?: string }>(config);
    booking.status = "canceled";
    booking.cancellationReason = payload.reason ?? "Canceled in demo mode";
    booking.canceledAt = new Date().toISOString();
    writeState(state);
    return response(config, booking);
  }

  const rescheduleMatch = url.match(/^\/bookings\/([^/]+)\/reschedule$/);
  if (rescheduleMatch && method === "patch") {
    const booking = state.bookings[rescheduleMatch[1]];
    if (!booking) return response(config, null, 404);
    const payload = body<{ startTime: string }>(config);
    booking.startTime = payload.startTime;
    booking.endTime = slotEnd(payload.startTime, serviceById(booking.serviceId).durationMin);
    booking.updatedAt = new Date().toISOString();
    writeState(state);
    return response(config, booking);
  }

  if (url === "/client-auth/csrf" || url === "/auth/csrf") {
    return response(config, { success: true });
  }

  if (url === "/client-auth/me" && method === "get") {
    return response(config, { client: state.client });
  }

  if (url === "/client-auth/register" && method === "post") {
    const payload = body<{ name: string; phone: string; telegramUsername?: string }>(config);
    state.client = {
      id: id("client"),
      name: payload.name,
      phone: payload.phone,
      telegramUsername: payload.telegramUsername,
    };
    writeState(state);
    return response(config, { client: state.client });
  }

  if (url === "/client-auth/login" && method === "post") {
    const payload = body<{ phone: string }>(config);
    state.client = state.client ?? {
      id: id("client"),
      name: "Demo Client",
      phone: payload.phone,
    };
    writeState(state);
    return response(config, { client: state.client });
  }

  if (url === "/client-auth/logout" && method === "post") {
    state.client = null;
    writeState(state);
    return response(config, { success: true as const });
  }

  if (url === "/auth/login" && method === "post") {
    state.adminLoggedIn = true;
    writeState(state);
    return response(config, { admin: demoAdmin });
  }

  if (url === "/auth/me" && method === "get") {
    return response(config, { admin: state.adminLoggedIn ? demoAdmin : null });
  }

  if (url === "/auth/logout" && method === "post") {
    state.adminLoggedIn = false;
    writeState(state);
    return response(config, { success: true as const });
  }

  if (url === "/admin/barbers" && method === "get") return response(config, barbers);
  if (url === "/admin/services" && method === "get") return response(config, services);

  if (url === "/admin/bookings" && method === "get") {
    const params = (config.params ?? {}) as {
      date?: string;
      barberId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    };
    let items = Object.values(state.bookings);
    if (params.date) items = items.filter((item) => item.startTime.slice(0, 10) === params.date);
    if (params.barberId) items = items.filter((item) => item.barberId === params.barberId);
    if (params.status) items = items.filter((item) => item.status === params.status);
    if (params.search) {
      const query = params.search.toLowerCase();
      items = items.filter((item) =>
        [item.clientName, item.clientPhone, item.notes ?? ""].some((value) =>
          value.toLowerCase().includes(query),
        ),
      );
    }
    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 20);
    const data: AdminBookingsResponse = {
      data: items.slice((page - 1) * limit, page * limit),
      meta: pagination(items.length, page, limit),
    };
    return response(config, data);
  }

  if (url === "/admin/bookings" && method === "post") {
    const payload = body<{
      barberId: string;
      serviceId: string;
      clientName: string;
      clientPhone: string;
      startTime: string;
      notes?: string;
      status?: Booking["status"];
    }>(config);
    const service = serviceById(payload.serviceId);
    const barber = barberById(payload.barberId);
    const booking: Booking = {
      id: id("booking"),
      barberId: barber.id,
      serviceId: service.id,
      source: "admin",
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      startTime: payload.startTime,
      endTime: slotEnd(payload.startTime, service.durationMin),
      status: payload.status ?? "confirmed",
      paymentStatus: "unpaid",
      priceSnapshot: service.price,
      currency: "UAH",
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      barber,
      service,
    };
    state.bookings[booking.id] = booking;
    writeState(state);
    return response(config, booking, 201);
  }

  const adminBookingStatusMatch = url.match(/^\/admin\/bookings\/([^/]+)\/status$/);
  if (adminBookingStatusMatch && method === "patch") {
    const booking = state.bookings[adminBookingStatusMatch[1]];
    const payload = body<{ status: Booking["status"] }>(config);
    if (booking) {
      booking.status = payload.status;
      writeState(state);
    }
    return response(config, booking ?? null);
  }

  if (url === "/admin/audit-logs" && method === "get") {
    const data: AdminAuditLogsResponse = {
      data: [
        {
          id: "demo-audit-1",
          adminEmail: demoAdmin.email,
          action: "demo_session",
          resource: "portfolio",
          summary: "Demo admin session is running locally in your browser.",
          createdAt: new Date().toISOString(),
        },
      ],
      meta: pagination(1, 1, 10),
    };
    return response(config, data);
  }

  const scheduleMatch = url.match(/^\/admin\/barbers\/([^/]+)\/schedule$/);
  if (scheduleMatch) {
    const data: ScheduleResponse = {
      barberId: scheduleMatch[1],
      days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        startTime: dayOfWeek === 0 ? null : "09:00",
        endTime: dayOfWeek === 0 ? null : "18:00",
        isDayOff: dayOfWeek === 0,
      })),
    };
    return response(config, data);
  }

  const exceptionsMatch = url.match(/^\/admin\/barbers\/([^/]+)\/schedule\/exceptions$/);
  if (exceptionsMatch) {
    const data: ScheduleExceptionsResponse = {
      barberId: exceptionsMatch[1],
      exceptions: [],
    };
    return response(config, data);
  }

  // Portfolio demo: accept admin CRUD without persisting catalogue edits.
  if (url.startsWith("/admin/") && ["post", "put", "patch", "delete"].includes(method)) {
    return response(config, body(config));
  }

  throw new Error(`Demo API does not implement ${method.toUpperCase()} ${url}`);
};
