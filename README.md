# 🏛️ Seminar Hall Booking App

A modern, responsive web application for booking seminar halls and conference rooms built with React, TypeScript, and Firebase.

## 🌟 Features

- **User Authentication** - Secure login/registration system
- **Hall Management** - Browse available seminar halls with detailed information
- **Smart Booking** - Real-time availability checking and booking system
- **Admin Dashboard** - Comprehensive management interface for administrators
- **Role-Based Access** - Different permissions for students, staff, and admins
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Installation & Setup

1. **Clone and Install Dependencies**

   ```bash
   cd seminar-hall-booking-app
   npm install
   ```

2. **Set Up Firebase**
   Follow the detailed setup guide in `FIREBASE_SETUP.md`

3. **Start Development Server**
   ```bash
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

### Current Status 🟢

✅ **Foundation Complete** - Authentication, routing, and UI framework ready  
📝 **Next**: Set up Firebase and implement core features

### Firebase Setup Required

Before using the app, you need to:

1. Create a Firebase project
2. Enable Authentication and Firestore
3. Update the configuration in `src/firebase/config.ts`

See `FIREBASE_SETUP.md` for detailed instructions.

---

## 📱 Application Features

### 🔐 Authentication System

- Secure user registration and login
- Role-based access (Student, Staff, Admin)
- Profile management

### 🏛️ Hall Management

- Browse available seminar halls
- View detailed hall information
- Search and filter capabilities

### 📅 Booking System

- Real-time availability checking
- Easy booking workflow
- Booking confirmation and management

### 👥 Admin Dashboard

- Manage halls and bookings
- User management
- Analytics and reporting

---

## 🛠️ Tech Stack

- **Frontend**: React 19.1.0 with TypeScript
- **UI Framework**: Material-UI (MUI)
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Routing**: React Router
- **State Management**: React Context API
- **Forms**: React Hook Form
- **Notifications**: React Toastify

---

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication components
│   └── layout/          # Layout components
├── contexts/            # React context providers
├── firebase/            # Firebase configuration and services
├── pages/               # Page components
│   └── admin/          # Admin-specific pages
└── routes/             # Application routing
```
