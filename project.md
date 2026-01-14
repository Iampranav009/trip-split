# RupayaSplit

RupayaSplit is a comprehensive web application designed to help users split bills and manage shared expenses. Built with React and TypeScript, it leverages Firebase for backend services, provides PDF invoice generation, and features advanced trip sharing and invitation capabilities.

## Tech Stack

- **Frontend Framework**: [React](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Backend/Database**: [Firebase](https://firebase.google.com/)
  - Authentication (Google & Email/Password)
  - Cloud Firestore (Real-time database)
- **UI Components**: [Lucide React](https://lucide.dev/)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **QR Codes**: [qrcode.react](https://github.com/zpao/qrcode.react)
- **Image Processing**: [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)

## Setup and Installation

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run locally:**
    ```bash
    npm run dev
    ```

3.  **Build for production:**
    ```bash
    npm run build
    ```

## Key Features

### Core Functionality
- **Bill Splitting**: Manage and split expenses among groups with multiple split types (Equal, Exact, Percentage)
- **Real-time Sync**: All data syncs instantly with Firebase across all devices
- **Settlement Calculation**: Smart algorithm to minimize number of transactions needed
- **PDF Invoices**: Generate professional, detailed invoices with member summaries and settlement instructions

### Trip Management
- **Create Trips**: Organize expenses by trip with automatic admin assignment
- **Member Management**: Add members with customizable avatars
- **Expense Tracking**: Add, edit, and delete expenses with flexible split options
- **Balance Overview**: Real-time balance calculations for all members

### Invitation & Sharing
- **Invite System**: Generate unique invite codes for each trip
- **QR Code Sharing**: Share trips via QR codes for easy mobile scanning
- **Join Requests**: Users can request to join trips
- **Admin Approval**: Trip admins can approve or reject join requests
- **Multi-channel Sharing**: Share via WhatsApp, Email, or direct link

### Profile & Customization
- **Profile Management**: Customize name, phone, and profile picture
- **Avatar Selection**: Choose from default avatars or upload custom images
- **Image Upload**: Automatic compression for custom profile pictures
- **Google/Email Login**: Flexible authentication options
- **Session Persistence**: Stay logged in across browser sessions

### User Interface
- **Modern Design**: Clean, responsive interface with smooth animations
- **Mobile-First**: Optimized for mobile and desktop viewing
- **Dark Mode Ready**: Foundation for theme customization
- **Real-time Updates**: Live updates without page refresh
- **Notification Badges**: Visual indicators for pending join requests

## Project Structure

```
trip-split-1/
├── components/
│   ├── CalculatorInput.tsx      # Calculator-style amount input
│   ├── InviteModal.tsx           # Trip invitation & sharing interface
│   ├── JoinRequestsModal.tsx     # Admin approval interface
│   └── AvatarSelector.tsx        # Avatar selection & upload
├── services/
│   ├── authService.ts            # Firebase Authentication
│   ├── dbService.ts              # Firestore database operations
│   ├── splitService.ts           # Split calculation logic
│   ├── inviteService.ts          # Invitation management
│   └── storageService.ts         # Local storage fallback
├── public/
│   └── images/                   # Avatar images
├── App.tsx                       # Main application component
├── types.ts                      # TypeScript type definitions
├── firebaseConfig.ts             # Firebase configuration
└── index.tsx                     # Application entry point
```

## Usage Guide

### Creating a Trip
1. Click the "+" button on the home screen
2. Enter a trip name and create
3. You'll automatically be added as the admin

### Inviting Friends
1. Open a trip
2. Click the "Share" button
3. Share via:
   - QR Code (scan with phone)
   - Direct link (copy to clipboard)
   - WhatsApp or Email

### Approving Join Requests (Admin Only)
1. Click the "Requests" button (shows notification badge when pending)
2. Review pending requests
3. Approve or reject each request

### Adding Expenses
1. Click the "+" button in trip view
2. Enter expense details
3. Choose split type:
   - **Equal**: Split evenly among selected members
   - **Exact**: Enter specific amounts for each member
   - **Percentage**: Assign percentages to each member
4. Save the expense

### Generating Invoices
1. Open a trip
2. Click the "Invoice" button
3. PDF will download automatically with:
   - Trip summary
   - Member-wise breakdown
   - Expenses table
   - Settlement instructions
   - Invite code

### Customizing Profile
1. Go to Profile tab
2. Click Settings
3. Update:
   - Profile picture (default avatars or custom upload)
   - Display name
   - Phone number

## Development

### Key Technologies Used

- **State Management**: React Hooks (useState, useEffect)
- **Real-time Data**: Firebase onSnapshot listeners
- **Routing**: View-based navigation system
- **Styling**: Inline Tailwind-like utility classes
- **Animations**: CSS keyframe animations

### Firebase Configuration

The app requires a Firebase project with:
- Authentication enabled (Google & Email/Password providers)
- Cloud Firestore database
- Security rules configured for trips collection

### Database Schema

**Trips Collection:**
```typescript
{
  id: string;
  name: string;
  totalExpense: number;
  members: Member[];
  expenses: Expense[];
  currency: string;
  createdBy: string;
  createdAt: number;
  inviteCode: string;
  joinRequests: JoinRequest[];
  memberIds: string[]; // For efficient querying
}
```

## Future Enhancements

- Multi-currency support
- Expense categories and filtering
- Receipt image uploads
- Trip templates
- Email notifications for join requests
- Export to CSV/Excel
- Recurring expenses
- Trip analytics and insights

## License

Built by Pranav

---

**Trip Splitter** - Making expense splitting simple, transparent, and collaborative.

