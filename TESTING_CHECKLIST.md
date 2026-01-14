# Testing Checklist

## 🧪 Feature Testing Guide

Use this checklist to verify all new features are working correctly.

---

## ✅ 1. Authentication & Profile

### Login Flow
- [ ] Google login works
- [ ] Email/Password signup works
- [ ] Email/Password login works
- [ ] Session persists after browser refresh
- [ ] Logout works correctly
- [ ] Error messages display for invalid credentials

### Profile Management
- [ ] Profile displays user name
- [ ] Profile displays user email
- [ ] Profile displays phone (if set)
- [ ] Profile displays correct avatar
- [ ] Custom avatar displays if uploaded
- [ ] Default avatar displays correctly

### Settings
- [ ] Settings page opens from Profile
- [ ] Can select default avatars (Boy/Girl)
- [ ] Can upload custom image
- [ ] Image upload compresses large files
- [ ] Selected avatar shows check mark
- [ ] Can update display name
- [ ] Can update phone number
- [ ] Save button works
- [ ] Changes persist after saving
- [ ] Back button returns to Profile

---

## ✅ 2. Trip Creation & Management

### Create Trip
- [ ] Can create new trip from home
- [ ] Trip name is required
- [ ] User is automatically added as admin
- [ ] Trip appears in home list
- [ ] Trip has auto-generated invite code
- [ ] Trip creator has 'admin' role

### Trip Dashboard
- [ ] Trip name displays correctly
- [ ] Creation date displays
- [ ] Total expense shows correctly
- [ ] Member count is accurate
- [ ] Can switch between trips
- [ ] Real-time updates work

---

## ✅ 3. Invitation System

### Share Trip (All Users)
- [ ] "Share" button visible on trip dashboard
- [ ] Share modal opens on click
- [ ] QR code generates correctly
- [ ] QR code scans to correct URL
- [ ] Invite code displays
- [ ] Share link displays
- [ ] Copy button copies link to clipboard
- [ ] "Copied" confirmation shows
- [ ] WhatsApp button opens with pre-filled message
- [ ] Email button opens email client
- [ ] Close button closes modal

### Join Requests (Admin Only)
- [ ] "Requests" button visible for trip admin
- [ ] "Requests" button hidden for non-admin members
- [ ] Notification badge shows pending count
- [ ] Badge updates in real-time
- [ ] Requests modal opens on click
- [ ] All pending requests display
- [ ] Request shows user name
- [ ] Request shows user email
- [ ] Request shows user avatar
- [ ] Request shows timestamp
- [ ] "Approve" button works
- [ ] "Reject" button works
- [ ] Approved user becomes member
- [ ] Request status updates
- [ ] Modal closes correctly
- [ ] Empty state shows when no requests

### Joining a Trip (Non-Admin)
- [ ] Can access shared link
- [ ] Can scan QR code
- [ ] Join request submits successfully
- [ ] Cannot submit duplicate request
- [ ] Notification sent to admin (badge appears)
- [ ] Can view request status

---

## ✅ 4. Invoice Generation

### PDF Invoice
- [ ] "Invoice" button visible on trip dashboard
- [ ] PDF downloads on click
- [ ] PDF filename is correct (TripName_Invoice.pdf)
- [ ] Invoice has professional header
- [ ] Trip details box shows:
  - [ ] Trip name
  - [ ] Creation date
  - [ ] Member count
  - [ ] Total expense
- [ ] Member Summary table shows:
  - [ ] All members
  - [ ] Total paid by each
  - [ ] Balance for each (settled/gets/owes)
- [ ] Settlement Instructions show:
  - [ ] Minimized transactions
  - [ ] Color-coded text (if using color PDF viewer)
  - [ ] Correct amounts
  - [ ] "All settled up" if balanced
- [ ] Expense Details table shows:
  - [ ] All expenses (excluding settlements)
  - [ ] Dates formatted correctly
  - [ ] Descriptions
  - [ ] Payer names
  - [ ] Amounts with currency symbol
  - [ ] Total row at bottom
- [ ] Footer shows:
  - [ ] Invite code
  - [ ] Generation timestamp
- [ ] Tables format correctly
- [ ] No data is cut off
- [ ] Multi-page PDFs work for long trips

---

## ✅ 5. Member Management

### Add Member
- [ ] Can add member manually
- [ ] Name is required
- [ ] Can select avatar
- [ ] New member appears in list
- [ ] New member has correct initial balance

### Member Display
- [ ] All members show in trip
- [ ] Avatar displays correctly
- [ ] Name displays correctly
- [ ] Balance displays correctly
- [ ] Role displays (admin designation if applicable)

---

## ✅ 6. Expense Management

### Add Expense
- [ ] Plus button opens add expense
- [ ] Title input works
- [ ] Calculator input works for amount
- [ ] Date picker works
- [ ] Can select payer
- [ ] Can switch split types (Equal/Exact/Percent)
- [ ] Equal split shows checkboxes
- [ ] Exact split shows amount inputs
- [ ] Percent split shows percentage inputs
- [ ] Validation works (totals must match)
- [ ] Progress bar shows allocation
- [ ] Save button enables when valid
- [ ] Expense saves successfully
- [ ] Expense appears in list
- [ ] Balances update correctly

### Edit Expense
- [ ] Tap expense to edit
- [ ] All fields populate correctly
- [ ] Can modify all fields
- [ ] Update button works
- [ ] Changes persist

### Delete Expense
- [ ] Delete button appears on hover/tap
- [ ] Confirmation prompt shows
- [ ] Deletion works
- [ ] Balances recalculate
- [ ] Expense removed from list

---

## ✅ 7. Balance & Settlement

### Balance View
- [ ] Balance tab accessible
- [ ] Net balances show for all members
- [ ] Positive balances in green
- [ ] Negative balances in red
- [ ] Zero balances in gray
- [ ] Settlement instructions show
- [ ] Minimized transactions (fewest possible)
- [ ] "All settled up" when balanced
- [ ] Mark Paid button works
- [ ] Settlement creates expense
- [ ] Balances update after settlement

---

## ✅ 8. UI/UX Elements

### Home Page
- [ ] Download button is removed (cleanup complete)
- [ ] Profile icon only in header
- [ ] Trip cards animate on load
- [ ] Trip cards show member count
- [ ] Trip cards show total expense
- [ ] Empty state shows when no trips
- [ ] Smooth transitions

### Animations
- [ ] Page transitions are smooth
- [ ] Modal open/close animations work
- [ ] Button hover effects work
- [ ] Active states work
- [ ] Loading states show when needed
- [ ] Notification badge animates (pop effect)

### Responsive Design
- [ ] Works on mobile (under 640px)
- [ ] Works on tablet (640-1024px)
- [ ] Works on desktop (over 1024px)
- [ ] Buttons are touch-friendly
- [ ] Text is readable on all sizes
- [ ] Modals fit screen on mobile

### Color Coding
- [ ] Invoice button is green
- [ ] Share button is blue/indigo
- [ ] Requests button is blue
- [ ] Delete buttons are red
- [ ] Cancel buttons are gray
- [ ] Primary actions are indigo

---

## ✅ 9. Data Persistence

### Real-time Sync
- [ ] Changes sync across devices
- [ ] Multiple users can view same trip
- [ ] Updates appear without refresh
- [ ] Firebase listeners work
- [ ] No data loss on refresh

### Local State
- [ ] Active trip persists in session
- [ ] View state maintains
- [ ] No undefined errors

---

## ✅ 10. Edge Cases

### Error Handling
- [ ] Invalid invite code shows error
- [ ] Network errors are handled
- [ ] Empty required fields show validation
- [ ] Duplicate requests prevented
- [ ] Invalid split amounts prevented

### Permissions
- [ ] Non-admins can't see Requests button
- [ ] Non-members can't view trip details
- [ ] Proper role enforcement

### Data Validation
- [ ] Can't create trip without name
- [ ] Can't save expense without title
- [ ] Can't save expense without amount
- [ ] Split percentages must equal 100%
- [ ] Split exact amounts must equal total
- [ ] Dates must be valid

---

## 🎯 Quick Smoke Test (5 minutes)

**Fastest way to verify core functionality:**

1. [ ] Login with Google
2. [ ] Update profile avatar in Settings
3. [ ] Create a new trip
4. [ ] Click Share button → verify QR code shows
5. [ ] Add an expense with Equal split
6. [ ] Click Invoice button → verify PDF downloads
7. [ ] Check Balance tab → verify settlements show
8. [ ] Logout and login again → verify session persists

---

## 📊 Browser Compatibility

Test in these browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## 🐛 Known Issues / Notes

Document any issues found during testing:

1. _Issue:_
   - _Description:_
   - _Steps to reproduce:_
   - _Expected behavior:_
   - _Actual behavior:_

2. _Issue:_
   - _Description:_
   - _Steps to reproduce:_
   - _Expected behavior:_
   - _Actual behavior:_

---

## ✨ Feature Completeness

**Phase 1: Trip Invitation & Joining**
- [x] Invite code generation
- [x] Join request submission
- [x] Admin approval system
- [x] Role-based permissions

**Phase 2: Share & Join Actions**
- [x] Share button
- [x] QR code generation
- [x] Multi-channel sharing
- [x] Join request notifications

**Phase 3: Invoice Generation**
- [x] Enhanced PDF export
- [x] Member summary
- [x] Settlement instructions
- [x] Professional formatting

**Phase 4: Home Page Cleanup**
- [x] Removed Download button
- [x] Improved animations
- [x] Better visual hierarchy

**Phase 5: Profile Improvements**
- [x] Avatar selection
- [x] Custom image upload
- [x] Settings page
- [x] Profile customization

**Phase 6: Login Flow**
- [x] Google authentication
- [x] Email authentication
- [x] Session persistence
- [x] Profile setup

---

**All features implemented and ready for testing! 🚀**

If you find any issues, document them in the Known Issues section above.
