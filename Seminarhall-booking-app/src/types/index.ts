// Common types for the Seminar Hall Booking App

export interface User {
	id: string;
	name: string;
	email: string;
	phone?: string;
	role: "student" | "faculty" | "admin" | "super_admin";
	department?: string;
	employeeId?: string;
	avatar?: string;
	createdAt: Date;
	lastLoginAt?: Date;
}

export interface SeminarHall {
	id: string;
	name: string;
	capacity: number;
	location: string;
	amenities: string[];
	equipment?: string[]; // Available equipment
	features?: string[]; // Hall features like AC, WiFi etc
	pricePerHour: number;
	images: string[];
	description?: string;
	isAvailable: boolean;
	maintenanceSchedule?: MaintenanceSlot[];
}

export interface Booking {
	id: string;
	userId: string;
	hallId: string;
	startTime: Date;
	endTime: Date;
	purpose: string;
	status: "pending" | "confirmed" | "cancelled" | "completed";
	totalAmount: number;
	createdAt: Date;
	updatedAt: Date;
	attendeeCount?: number;
	specialRequirements?: string;
	equipmentRequested?: string[];
	cancellationReason?: string;
	approvedBy?: string;
	approvedAt?: Date;
}

export interface TimeSlot {
	startTime: string;
	endTime: string;
	isAvailable: boolean;
	price: number;
}

export interface MaintenanceSlot {
	id: string;
	hallId: string;
	startTime: Date;
	endTime: Date;
	description: string;
	type: "routine" | "repair" | "deep_cleaning";
	assignedTo?: string;
	status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

export interface Notification {
	id: string;
	userId: string;
	title: string;
	message: string;
	type: "booking" | "reminder" | "update" | "system" | "maintenance";
	isRead: boolean;
	data?: any; // Additional notification data
	createdAt: Date;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	message?: string;
	error?: string;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterData {
	name: string;
	email: string;
	password: string;
	phone?: string;
	role: "faculty" | "admin";
	department?: string;
	employeeId?: string;
}

export interface BookingFormData {
	hallId: string;
	date: Date;
	startTime: string;
	endTime: string;
	purpose: string;
	attendeeCount: number;
	specialRequirements?: string;
	equipmentRequested?: string[];
	isRecurring?: boolean;
	recurringPattern?: {
		frequency: "daily" | "weekly" | "monthly";
		endDate: Date;
		daysOfWeek?: number[]; // For weekly pattern
	};
}

export interface HallFilter {
	searchQuery?: string;
	capacity?: number;
	equipment?: string[];
	features?: string[];
	location?: string;
	availableOnly?: boolean;
}
