# RupayaSplit (Trip Splitter) - Complete Project Documentation & Master Guide

---

## 📌 Executive Summary

**RupayaSplit** (also referenced as **Trip Splitter**) is a modern, full-featured web and mobile cross-platform application built for seamless group expense tracking, bill splitting, and debt settlement. Designed with a mobile-first philosophy, the application enables groups of friends, roommates, and travelers to log shared expenses, calculate exact balances, simplify debt transfers to minimize payment transactions, generate exportable PDF invoices, and invite members via QR codes or direct links.

The project is built on **React 18**, **TypeScript**, and **Vite**, utilizing **Firebase Cloud Firestore** and **Firebase Authentication** for real-time multi-device database synchronization and secure login. It also features an offline fallback mechanism using browser storage and cookie persistence, as well as native mobile wrapping via **Capacitor** for Android.

---

## 🛠️ Tech Stack & Key Libraries

| Category | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 (`react`, `react-dom`) | UI Component Architecture |
| **Build System** | Vite 5 (`vite`, `@vitejs/plugin-react`) | High-performance build tool & HMR dev server |
| **Language** | TypeScript 5 | Strict static typing across models, props, and APIs |
| **Backend & DB** | Firebase 10 (`firebase/auth`, `firebase/firestore`) | Real-time NoSQL DB, multi-device synchronization, and Auth |
| **Authentication** | Google Auth & Email/Password | Flexible sign-in strategies |
| **Icons & Visuals** | Lucide React (`lucide-react`) | Sleek vector icons throughout the interface |
| **PDF Generation** | `jspdf` & `jspdf-autotable` | Client-side generation of trip summary invoices |
| **QR Code Engine** | `qrcode.react` | Dynamic QR code generation for mobile invitations |
| **Image Compression** | `browser-image-compression` | Client-side avatar compression before storing |
| **Session Cookies** | `js-cookie` | Session persistence and user state restoration |
| **Mobile Runtime** | Capacitor 6 (`@capacitor/core`, `@capacitor/android`) | Web-to-native Android APK packaging |

---

## 📁 Repository Directory Structure

```
trip-split/
├── .agent/                             # Workflows and agent configuration guides
│   └── workflows/
│       ├── android-setup.md            # Guide for Android conversion
│       └── feature-enhancements.md     # Feature implementation plan & checklist
├── components/                         # Modular React UI Components
│   ├── AvatarSelector.tsx              # Avatar selection modal & image upload/compression
│   ├── CalculatorInput.tsx             # Interactive calculator-style numeric keypad
│   ├── ConfirmModal.tsx                # Confirmation modal for destructive actions
│   ├── InviteModal.tsx                 # QR code & multi-channel trip invite dialog
│   └── JoinRequestsModal.tsx           # Admin approval UI for pending join requests
├── services/                           # Business Logic & Backend Service Layer
│   ├── authService.ts                  # Firebase Auth & persistence utilities
│   ├── dbService.ts                    # Firestore real-time CRUD & offline fallback
│   ├── firebaseService.ts              # Firebase initialization & instance exports
│   ├── inviteService.ts                # Invite codes & join request workflow
│   ├── splitService.ts                 # Settlement algorithm & balance math
│   └── storageService.ts               # LocalStorage backup engine
├── public/                             # Static Assets
│   └── images/                         # Default profile avatar presets
├── .env.example                        # Template for Firebase credentials & config
├── ANDROID_CONVERSION_GUIDE.md         # Comprehensive Android Capacitor build guide
├── ANDROID_SETUP.md                    # Quick guide for running on Android devices
├── App.tsx                             # Main Application container, state engine & views
├── capacitor.config.json               # Capacitor mobile project config
├── firebaseConfig.ts                   # Firebase initialization setup
├── IMPLEMENTATION_SUMMARY.md           # Historical breakdown of completed features
├── index.html                          # Single-page entry HTML document with fonts
├── index.tsx                           # Application mounting point
├── metadata.json                       # Project metadata declaration
├── package.json                        # NPM package manifest & script definitions
├── project.md                          # Initial project summary
├── README.md                           # Quickstart guide
├── TESTING_CHECKLIST.md                # Comprehensive QA & test plan
├── tsconfig.json                       # TypeScript compiler preferences
├── types.ts                            # Global TypeScript interfaces & types
├── USER_GUIDE.md                       # Comprehensive end-user documentation
└── vercel.json                         # Vercel deployment configuration
```

---

## 🗃️ Core Data Models & Schemas (`types.ts`)

### 1. `User` & `UserPreferences`
Represents an authenticated application user.
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  customAvatarUrl?: string;
  onboardingCompleted?: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  currency?: string;
  notifications?: boolean;
}
```

### 2. `Member` & `MemberRole`
Represents a participant within a specific trip.
```typescript
export type MemberRole = 'admin' | 'member';

export interface Member {
  id: string;
  name: string;
  avatarUrl?: string;
  totalPaid: number;
  balance: number; // Positive (+) = receives money, Negative (-) = owes money
  role?: MemberRole;
  joinedAt?: number;
}
```

### 3. `Trip`
The primary collection document containing trip metadata, members, expenses, and join requests.
```typescript
export interface Trip {
  id: string;
  name: string;
  totalExpense: number;
  members: Member[];
  expenses: Expense[];
  currency: string;
  createdBy: string;
  createdAt: number;
  inviteCode?: string;
  joinRequests?: JoinRequest[];
}
```

### 4. `Expense` & `SplitType`
Represents an individual expense item logged within a trip.
```typescript
export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENT';

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  paidByMemberId: string;
  splitAmongMemberIds: string[];
  splitType?: SplitType;
  splitValues?: { [memberId: string]: number }; // Stores exact amounts or percentage ratios
  date: string; // ISO String format
}
```

### 5. `JoinRequest` & `Debt`
```typescript
export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Debt {
  from: string; // Debtor member name
  to: string;   // Creditor member name
  amount: number;
}
```

---

## ⚙️ Architecture & Service Layer Breakdown

### 1. Database & Persistence Services
- **`dbService.ts`**: Handles Firestore operations including `createTrip`, `getTrip`, `listenToTrip` (real-time sync via `onSnapshot`), `addExpenseToTrip`, `updateExpenseInTrip`, `deleteExpenseFromTrip`, and member balance recalibration. Includes automatic fallback to `storageService.ts` if offline or Firebase is unreachable.
- **`storageService.ts`**: Provides `localStorage`-backed persistence when offline, preserving trips, user profiles, and active state across sessions without a network connection.

### 2. Authentication & User Profile Services
- **`authService.ts`**: Integrates Firebase Auth supporting Google Popup authentication and Email/Password credentials. Maintains user session persistence via `js-cookie` and local storage sync.
- **`AvatarSelector.tsx`**: Custom UI component for picking default avatars (Boy, Girl) or uploading custom images. Custom images are automatically compressed on-device using `browser-image-compression` (max size: 500KB, max dimension: 400px) and converted into base64 format for compact cloud storage.

### 3. Invitation & Membership Engine
- **`inviteService.ts`**: Handles unique alphanumeric invite code generation (e.g. `TRIP-7A8B9C`), trip lookups by invite code, request-to-join creation, and admin approval/rejection operations.
- **`InviteModal.tsx`**: Displays QR code (via `qrcode.react`), copyable link, and quick share actions (WhatsApp, Email, Clipboard).
- **`JoinRequestsModal.tsx`**: Admin panel showing pending requests with instant approval or rejection controls.

### 4. Settlement Engine (`splitService.ts`)
Calculates individual member balances (`totalPaid - shareOwed`) and applies a **Greedy Debt Minimization Algorithm** to resolve overall debts into the absolute minimum number of peer-to-peer financial transactions.
1. Partition members into debtors (negative balance) and creditors (positive balance).
2. Pair the largest debtor with the largest creditor.
3. Settle the smaller of the two amounts, update balances, and repeat until all balances reach zero.

---

## 🖼️ Primary User Interfaces & View Flow

```
                  ┌────────────────────────┐
                  │    LOGIN / ONBOARDING  │
                  └───────────┬────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │        HOME VIEW       │
                  │  (Trip List, Create,   │
                  │   Join via Code/QR)    │
                  └───────────┬────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  TRIP DASHBOARD  │ │  TRIP BALANCES   │ │ USER SETTINGS &  │
│ (Expenses List,  │ │ (Debts, Min-Pay  │ │     PROFILE      │
│  Add Expense,    │ │ Matrix, Invoice  │ │ (Avatar, Name,   │
│  Share, Admin)   │ │  PDF Generator)  │ │  Preferences)    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 📱 Mobile App (Android) Capability

RupayaSplit is configured with **Capacitor 6** to support direct compilation into a native Android app (`.apk` / `.aab`).
- **Config**: `capacitor.config.json` sets `appId: "com.rupayasplit.app"` and `appName: "RupayaSplit"`.
- **Build commands**:
  1. Build web bundle: `npm run build`
  2. Sync assets: `npx cap sync android`
  3. Launch Android Studio: `npx cap open android`

---

## 🚀 Key Features Matrix

| Feature | Description | Implementation Detail |
| :--- | :--- | :--- |
| **Real-time Collaboration** | Instant updates across all trip members | Firestore `onSnapshot` listener in `dbService.ts` |
| **Flexible Bill Split** | Equal, Exact, or Percentage splits | Handled in `CalculatorInput.tsx` and `splitService.ts` |
| **Smart Settlement** | Minimizes transaction count between members | Greedy balancing algorithm in `splitService.ts` |
| **PDF Summary Generator** | Downloads detailed trip settlement invoice | Uses `jspdf` and `jspdf-autotable` in `App.tsx` |
| **Multi-channel Invitations**| Invite via QR Code, link, WhatsApp, or Email | `InviteModal.tsx` & `inviteService.ts` |
| **Admin Join Approval** | Admins control who enters the trip group | `JoinRequestsModal.tsx` with notification badges |
| **Profile & Custom Avatars** | Pick presets or compress custom image uploads | `browser-image-compression` in `AvatarSelector.tsx` |
| **Offline Resilience** | Full functionality offline with local storage | Dual persistence layer (`dbService` + `storageService`) |

---

## 📜 Verification & Status Summary

- **Web Application**: Fully functional on local Vite dev server (`npm run dev`) and production builds (`npm run build`).
- **Firebase Integration**: Firestore rules, Auth endpoints, and data real-time hooks configured.
- **Documentation**: All developer guides (`project.md`, `USER_GUIDE.md`, `ANDROID_CONVERSION_GUIDE.md`, `TESTING_CHECKLIST.md`, `IMPLEMENTATION_SUMMARY.md`) and this master file `one.md` are aligned.

---
*Document generated for RupayaSplit repository overview.*
