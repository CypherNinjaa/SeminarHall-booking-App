# 🛠️ Technical Setup Guide

## 📱 Expo React Native Setup

### Prerequisites

```bash
# Install Node.js (v18 or higher)
# Install Expo CLI
npm install -g @expo/cli

# Install EAS CLI for building
npm install -g eas-cli
```

### Project Initialization

```bash
# Create new Expo project
npx create-expo-app AmityHallBooking --template

# Navigate to project
cd AmityHallBooking

# Install additional dependencies
npx expo install expo-notifications expo-calendar
npm install @supabase/supabase-js @tanstack/react-query zustand react-hook-form nodemailer @types/nodemailer
```

### Required Dependencies

```json
{
	"dependencies": {
		"@expo/vector-icons": "^13.0.0",
		"@react-native-async-storage/async-storage": "1.18.2",
		"@supabase/supabase-js": "^2.38.0",
		"@tanstack/react-query": "^4.35.0",
		"@types/nodemailer": "^6.4.7",
		"expo": "~49.0.0",
		"expo-calendar": "~12.3.0",
		"expo-notifications": "~0.20.1",
		"expo-status-bar": "~1.6.0",
		"nativewind": "^2.0.11",
		"nodemailer": "^6.9.1",
		"react": "18.2.0",
		"react-hook-form": "^7.45.0",
		"react-native": "0.72.4",
		"react-native-safe-area-context": "4.6.3",
		"react-native-screens": "~3.22.0",
		"zustand": "^4.4.0"
	}
}
```

## 🗄️ Supabase Setup

### Database Configuration

```sql
-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'faculty');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seminar_halls ENABLE ROW LEVEL SECURITY;
```

### Environment Variables

```typescript
// .env.local
EXPO_PUBLIC_SUPABASE_URL = your_supabase_url;
EXPO_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key;

// Gmail SMTP (Recommended - FREE)
GMAIL_USER = admin@amity.edu;
GMAIL_APP_PASSWORD = your_16_character_app_password;
GMAIL_FROM_NAME = "Amity University Patna";
GMAIL_REPLY_TO = admin@amity.edu;

// SendGrid (Alternative - Paid)
SENDGRID_API_KEY = your_sendgrid_api_key;
```

## 📧 Email Service Setup Options

### Option 1: Gmail SMTP (Recommended - FREE)

#### Gmail SMTP Configuration

```typescript
// lib/email.ts
import nodemailer from "nodemailer";

// Create Gmail SMTP transporter
export const gmailTransporter = nodemailer.createTransporter({
	service: "gmail",
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_APP_PASSWORD,
	},
});

export const sendBookingConfirmation = async (booking: Booking) => {
	const mailOptions = {
		from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
		to: booking.faculty.email,
		subject: `✅ Booking Confirmed - ${booking.hall.name}`,
		html: generateBookingEmailTemplate(booking),
		replyTo: process.env.GMAIL_REPLY_TO,
	};

	const info = await gmailTransporter.sendMail(mailOptions);
	return { success: true, messageId: info.messageId };
};
```

#### Gmail Setup Steps

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account → Security → App passwords
   - Select "Mail" and "Other (custom name)"
   - Enter "Amity Booking App"
   - Copy the 16-character password
3. **Add to Environment Variables**:
   ```bash
   GMAIL_USER=admin@amity.edu
   GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
   ```

### Option 2: SendGrid (Alternative - Paid)

### SendGrid Configuration

```typescript
// lib/email.ts
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const sendBookingConfirmation = async (booking: Booking) => {
	const msg = {
		to: booking.faculty.email,
		from: "bookings@amity.edu",
		templateId: "d-bookingconfirmation123",
		dynamicTemplateData: {
			facultyName: booking.faculty.name,
			hallName: booking.hall.name,
			bookingDate: formatDate(booking.startTime),
			startTime: formatTime(booking.startTime),
			endTime: formatTime(booking.endTime),
			eventTitle: booking.title,
		},
	};

	await sgMail.send(msg);
};
```

### Email Templates

```typescript
// utils/emailTemplates.ts
export const generateBookingEmailTemplate = (booking: Booking) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Confirmation</title>
  <style>
    .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
    .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .booking-details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏛️ Amity University Patna</h1>
      <h2>Seminar Hall Booking Confirmation</h2>
    </div>
    
    <div class="content">
      <p>Dear ${booking.faculty.name},</p>
      
      <p>Your seminar hall booking has been <strong>confirmed</strong>!</p>
      
      <div class="booking-details">
        <h3>📋 Booking Details</h3>
        <p><strong>📍 Hall:</strong> ${booking.hall.name}</p>
        <p><strong>📅 Date:</strong> ${formatDate(booking.startTime)}</p>
        <p><strong>⏰ Time:</strong> ${formatTime(
					booking.startTime
				)} - ${formatTime(booking.endTime)}</p>
        <p><strong>👥 Capacity:</strong> ${booking.attendeeCount} people</p>
        <p><strong>🎯 Purpose:</strong> ${booking.title}</p>
        ${
					booking.description
						? `<p><strong>📝 Description:</strong> ${booking.description}</p>`
						: ""
				}
      </div>
      
      ${
				booking.equipment.length > 0
					? `
      <div class="booking-details">
        <h3>🛠️ Equipment Included</h3>
        <ul>
          ${booking.equipment.map((eq) => `<li>${eq}</li>`).join("")}
        </ul>
      </div>
      `
					: ""
			}
      
      <div class="booking-details">
        <h3>⚠️ Important Notes</h3>
        <ul>
          <li>Please arrive 10 minutes before your scheduled time</li>
          <li>Contact admin for any changes: admin@amity.edu</li>
          <li>Cancellation allowed up to 24 hours before the event</li>
          <li>Ensure all equipment is returned in working condition</li>
        </ul>
      </div>
      
      <p>If you need to make any changes or have questions, please contact us immediately.</p>
    </div>
    
    <div class="footer">
      <p>This is an automated email. Please do not reply.</p>
      <p>© 2025 Amity University Patna. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
```

## 🔔 Push Notifications Setup

### Expo Notifications Configuration

```typescript
// services/notificationService.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
	}),
});

export const registerForPushNotifications = async () => {
	let token;

	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== "granted") {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}

	if (finalStatus !== "granted") {
		alert("Failed to get push token for push notification!");
		return;
	}

	token = (await Notifications.getExpoPushTokenAsync()).data;

	if (Platform.OS === "android") {
		Notifications.setNotificationChannelAsync("default", {
			name: "default",
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: "#FF231F7C",
		});
	}

	return token;
};

export const sendBookingNotification = async (
	expoPushToken: string,
	booking: Booking,
	type: "confirmation" | "reminder" | "cancellation"
) => {
	const message = {
		to: expoPushToken,
		sound: "default",
		title: getNotificationTitle(type),
		body: getNotificationBody(booking, type),
		data: { bookingId: booking.id, type },
	};

	await fetch("https://exp.host/--/api/v2/push/send", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Accept-encoding": "gzip, deflate",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(message),
	});
};
```

## 📱 App Structure

### Project Directory Structure

```
AmityHallBooking/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── ui/               # UI components
│   ├── forms/            # Form components
│   └── booking/          # Booking-specific components
├── services/             # API and external services
│   ├── supabase.ts      # Supabase client
│   ├── emailService.ts  # Email service
│   └── notificationService.ts
├── stores/               # Zustand stores
│   ├── authStore.ts     # Authentication state
│   ├── bookingStore.ts  # Booking state
│   └── uiStore.ts       # UI state
├── types/                # TypeScript types
├── utils/                # Utility functions
└── constants/            # App constants
```

## 🔐 Authentication Flow

### Supabase Auth Setup

```typescript
// services/supabase.ts
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});

// Authentication functions
export const signUpWithEmail = async (
	email: string,
	password: string,
	userData: any
) => {
	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: userData,
		},
	});
	return { data, error };
};

export const signInWithEmail = async (email: string, password: string) => {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});
	return { data, error };
};
```

## 📊 State Management with Zustand

### Booking Store

```typescript
// stores/bookingStore.ts
import { create } from "zustand";
import { Booking, SeminarHall } from "../types";

interface BookingStore {
	bookings: Booking[];
	halls: SeminarHall[];
	selectedHall: SeminarHall | null;
	selectedDate: Date;
	isLoading: boolean;

	// Actions
	setBookings: (bookings: Booking[]) => void;
	setHalls: (halls: SeminarHall[]) => void;
	setSelectedHall: (hall: SeminarHall | null) => void;
	setSelectedDate: (date: Date) => void;
	addBooking: (booking: Booking) => void;
	updateBooking: (id: string, updates: Partial<Booking>) => void;
	removeBooking: (id: string) => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
	bookings: [],
	halls: [],
	selectedHall: null,
	selectedDate: new Date(),
	isLoading: false,

	setBookings: (bookings) => set({ bookings }),
	setHalls: (halls) => set({ halls }),
	setSelectedHall: (hall) => set({ selectedHall: hall }),
	setSelectedDate: (date) => set({ selectedDate: date }),

	addBooking: (booking) =>
		set((state) => ({ bookings: [...state.bookings, booking] })),

	updateBooking: (id, updates) =>
		set((state) => ({
			bookings: state.bookings.map((booking) =>
				booking.id === id ? { ...booking, ...updates } : booking
			),
		})),

	removeBooking: (id) =>
		set((state) => ({
			bookings: state.bookings.filter((booking) => booking.id !== id),
		})),
}));
```

## 🚀 Deployment

### Expo Build Configuration

```json
// eas.json
{
	"cli": {
		"version": ">= 3.0.0"
	},
	"build": {
		"development": {
			"developmentClient": true,
			"distribution": "internal"
		},
		"preview": {
			"distribution": "internal",
			"android": {
				"buildType": "apk"
			}
		},
		"production": {
			"autoIncrement": true
		}
	},
	"submit": {
		"production": {}
	}
}
```

### Build Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for development
eas build --profile development --platform android

# Build for production
eas build --profile production --platform all
```

## 📱 PWA Configuration (Alternative Web Version)

### PWA Manifest

```json
// public/manifest.json
{
	"name": "Amity Hall Booking",
	"short_name": "AmityBooking",
	"description": "Seminar Hall Booking System for Amity University Patna",
	"start_url": "/",
	"display": "standalone",
	"background_color": "#ffffff",
	"theme_color": "#1e40af",
	"icons": [
		{
			"src": "/icon-192.png",
			"sizes": "192x192",
			"type": "image/png"
		},
		{
			"src": "/icon-512.png",
			"sizes": "512x512",
			"type": "image/png"
		}
	]
}
```

## 🔧 Development Scripts

### Package.json Scripts

```json
{
	"scripts": {
		"start": "expo start",
		"android": "expo start --android",
		"ios": "expo start --ios",
		"web": "expo start --web",
		"build:android": "eas build --profile production --platform android",
		"build:ios": "eas build --profile production --platform ios",
		"submit:android": "eas submit --platform android",
		"submit:ios": "eas submit --platform ios"
	}
}
```

## 📝 Testing Setup

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
	preset: "jest-expo",
	transformIgnorePatterns: [
		"node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)",
	],
};
```

---

**Next Steps:**

1. Set up Supabase project and configure database
2. Set up Resend account for email services
3. Initialize Expo project with required dependencies
4. Implement authentication flow
5. Build core booking functionality
6. Set up email automation
7. Configure push notifications
8. Deploy and test

_For specific implementation details, refer to the component examples in the next documentation file._
