import { create } from "zustand";
import { SeminarHall, Booking, TimeSlot } from "../types";

interface BookingState {
	// State
	halls: SeminarHall[];
	bookings: Booking[];
	selectedHall: SeminarHall | null;
	selectedDate: Date;
	selectedTimeSlot: TimeSlot | null;
	availableSlots: TimeSlot[];
	isLoading: boolean;
	error: string | null;

	// Filters & Search
	searchQuery: string;
	filterByCapacity: number | null;
	filterByEquipment: string[];

	// Actions
	setHalls: (halls: SeminarHall[]) => void;
	setBookings: (bookings: Booking[]) => void;
	setSelectedHall: (hall: SeminarHall | null) => void;
	setSelectedDate: (date: Date) => void;
	setSelectedTimeSlot: (slot: TimeSlot | null) => void;
	setAvailableSlots: (slots: TimeSlot[]) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	clearError: () => void;

	// Search & Filter actions
	setSearchQuery: (query: string) => void;
	setCapacityFilter: (capacity: number | null) => void;
	setEquipmentFilter: (equipment: string[]) => void;
	clearFilters: () => void;

	// Data fetching actions
	fetchHalls: () => Promise<void>;
	fetchBookings: () => Promise<void>;
	fetchAvailableSlots: (hallId: string, date: Date) => Promise<void>;

	// Booking actions
	createBooking: (bookingData: Partial<Booking>) => Promise<void>;
	updateBooking: (id: string, updates: Partial<Booking>) => Promise<void>;
	cancelBooking: (id: string, reason?: string) => Promise<void>;

	// Conflict detection
	checkForConflicts: (
		hallId: string,
		startTime: Date,
		endTime: Date
	) => boolean;

	// Computed getters
	getFilteredHalls: () => SeminarHall[];
	getUserBookings: (userId: string) => Booking[];
	getUpcomingBookings: (userId: string) => Booking[];
}

export const useBookingStore = create<BookingState>((set, get) => ({
	// Initial state
	halls: [],
	bookings: [],
	selectedHall: null,
	selectedDate: new Date(),
	selectedTimeSlot: null,
	availableSlots: [],
	isLoading: false,
	error: null,

	// Filters
	searchQuery: "",
	filterByCapacity: null,
	filterByEquipment: [],

	// Basic setters
	setHalls: (halls) => set({ halls, error: null }),
	setBookings: (bookings) => set({ bookings, error: null }),
	setSelectedHall: (hall) => set({ selectedHall: hall }),
	setSelectedDate: (date) => set({ selectedDate: date }),
	setSelectedTimeSlot: (slot) => set({ selectedTimeSlot: slot }),
	setAvailableSlots: (slots) => set({ availableSlots: slots }),
	setLoading: (isLoading) => set({ isLoading }),
	setError: (error) => set({ error, isLoading: false }),
	clearError: () => set({ error: null }),

	// Search & Filter setters
	setSearchQuery: (searchQuery) => set({ searchQuery }),
	setCapacityFilter: (filterByCapacity) => set({ filterByCapacity }),
	setEquipmentFilter: (filterByEquipment) => set({ filterByEquipment }),
	clearFilters: () =>
		set({
			searchQuery: "",
			filterByCapacity: null,
			filterByEquipment: [],
		}),

	// Data fetching
	fetchHalls: async () => {
		set({ isLoading: true, error: null });

		try {
			// TODO: Replace with actual Supabase call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const mockHalls: SeminarHall[] = [
				{
					id: "1",
					name: "Conference Hall A",
					capacity: 50,
					location: "Building A, Floor 3",
					amenities: ["Projector", "Air Conditioning", "WiFi", "Microphone"],
					pricePerHour: 0, // Free for university use
					images: [
						"https://via.placeholder.com/400x300/1e40af/ffffff?text=Hall+A",
					],
					description:
						"Modern conference hall perfect for seminars and presentations",
					isAvailable: true,
					equipment: ["projector", "microphone", "whiteboard"],
					features: ["air_conditioning", "wifi", "power_outlets"],
				},
				{
					id: "2",
					name: "Seminar Room B",
					capacity: 30,
					location: "Building B, Floor 2",
					amenities: ["Projector", "Air Conditioning", "WiFi"],
					pricePerHour: 0,
					images: [
						"https://via.placeholder.com/400x300/10b981/ffffff?text=Hall+B",
					],
					description: "Intimate seminar room ideal for smaller groups",
					isAvailable: true,
					equipment: ["projector", "whiteboard"],
					features: ["air_conditioning", "wifi"],
				},
			];

			set({ halls: mockHalls, isLoading: false });
		} catch (error) {
			set({
				error: error instanceof Error ? error.message : "Failed to fetch halls",
				isLoading: false,
			});
		}
	},

	fetchBookings: async () => {
		set({ isLoading: true, error: null });

		try {
			// TODO: Replace with actual Supabase call
			await new Promise((resolve) => setTimeout(resolve, 800));

			const mockBookings: Booking[] = [
				{
					id: "1",
					userId: "1",
					hallId: "1",
					startTime: new Date("2025-07-10T10:00:00"),
					endTime: new Date("2025-07-10T12:00:00"),
					purpose: "Department Faculty Meeting",
					status: "confirmed",
					totalAmount: 0,
					createdAt: new Date("2025-07-05T09:00:00"),
					updatedAt: new Date("2025-07-05T09:00:00"),
					attendeeCount: 25,
					specialRequirements: "Need projector and microphone",
					equipmentRequested: ["projector", "microphone"],
				},
			];

			set({ bookings: mockBookings, isLoading: false });
		} catch (error) {
			set({
				error:
					error instanceof Error ? error.message : "Failed to fetch bookings",
				isLoading: false,
			});
		}
	},

	fetchAvailableSlots: async (hallId: string, date: Date) => {
		set({ isLoading: true, error: null });

		try {
			// TODO: Replace with actual availability checking
			await new Promise((resolve) => setTimeout(resolve, 500));

			const mockSlots: TimeSlot[] = [
				{ startTime: "09:00", endTime: "10:00", isAvailable: true, price: 0 },
				{ startTime: "10:00", endTime: "11:00", isAvailable: false, price: 0 },
				{ startTime: "11:00", endTime: "12:00", isAvailable: false, price: 0 },
				{ startTime: "12:00", endTime: "13:00", isAvailable: true, price: 0 },
				{ startTime: "14:00", endTime: "15:00", isAvailable: true, price: 0 },
				{ startTime: "15:00", endTime: "16:00", isAvailable: true, price: 0 },
				{ startTime: "16:00", endTime: "17:00", isAvailable: true, price: 0 },
			];

			set({ availableSlots: mockSlots, isLoading: false });
		} catch (error) {
			set({
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch available slots",
				isLoading: false,
			});
		}
	},

	createBooking: async (bookingData) => {
		set({ isLoading: true, error: null });

		try {
			// TODO: Replace with actual Supabase call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const newBooking: Booking = {
				id: Date.now().toString(),
				userId: bookingData.userId!,
				hallId: bookingData.hallId!,
				startTime: bookingData.startTime!,
				endTime: bookingData.endTime!,
				purpose: bookingData.purpose!,
				status: "pending",
				totalAmount: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				attendeeCount: bookingData.attendeeCount || 1,
				specialRequirements: bookingData.specialRequirements,
				equipmentRequested: bookingData.equipmentRequested || [],
			};

			const { bookings } = get();
			set({
				bookings: [...bookings, newBooking],
				isLoading: false,
				selectedTimeSlot: null,
			});
		} catch (error) {
			set({
				error:
					error instanceof Error ? error.message : "Failed to create booking",
				isLoading: false,
			});
			throw error;
		}
	},

	updateBooking: async (id, updates) => {
		set({ isLoading: true, error: null });

		try {
			// TODO: Replace with actual Supabase call
			await new Promise((resolve) => setTimeout(resolve, 800));

			const { bookings } = get();
			const updatedBookings = bookings.map((booking) =>
				booking.id === id
					? { ...booking, ...updates, updatedAt: new Date() }
					: booking
			);

			set({ bookings: updatedBookings, isLoading: false });
		} catch (error) {
			set({
				error:
					error instanceof Error ? error.message : "Failed to update booking",
				isLoading: false,
			});
			throw error;
		}
	},

	cancelBooking: async (id, reason) => {
		await get().updateBooking(id, {
			status: "cancelled",
			cancellationReason: reason,
		});
	},

	checkForConflicts: (hallId, startTime, endTime) => {
		const { bookings } = get();

		return bookings.some(
			(booking) =>
				booking.hallId === hallId &&
				booking.status !== "cancelled" &&
				((startTime >= booking.startTime && startTime < booking.endTime) ||
					(endTime > booking.startTime && endTime <= booking.endTime) ||
					(startTime <= booking.startTime && endTime >= booking.endTime))
		);
	},

	// Computed getters
	getFilteredHalls: () => {
		const { halls, searchQuery, filterByCapacity, filterByEquipment } = get();

		return halls.filter((hall) => {
			const matchesSearch =
				!searchQuery ||
				hall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				hall.location.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesCapacity =
				!filterByCapacity || hall.capacity >= filterByCapacity;

			const matchesEquipment =
				filterByEquipment.length === 0 ||
				filterByEquipment.every(
					(equipment) =>
						hall.equipment?.includes(equipment) ||
						hall.amenities.some((amenity) =>
							amenity.toLowerCase().includes(equipment.toLowerCase())
						)
				);

			return matchesSearch && matchesCapacity && matchesEquipment;
		});
	},

	getUserBookings: (userId) => {
		const { bookings } = get();
		return bookings.filter((booking) => booking.userId === userId);
	},

	getUpcomingBookings: (userId) => {
		const { bookings } = get();
		const now = new Date();

		return bookings
			.filter(
				(booking) =>
					booking.userId === userId &&
					booking.startTime > now &&
					booking.status !== "cancelled"
			)
			.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
	},
}));
