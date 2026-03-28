# HomeHub — Screen Index

Static HTML mockups for all Wave 0 screens. Each file is self-contained (inline CSS, no build step) and renders at 390px mobile width using the Burgundy theme.

## Screens

| Screen | File | Description |
|--------|------|-------------|
| Auth | [screens/auth.html](screens/auth.html) | Sign In / Sign Up / Join tabs with email+password fields, forgot password link, and Google OAuth button |
| Home Dashboard | [screens/home-dashboard.html](screens/home-dashboard.html) | Root hub grid with 4 hub cards (Shopping, Tasks, Vouchers, Reservations), Attention Banner, and bottom nav with urgent badge |
| Shopping Hub | [screens/shopping-hub.html](screens/shopping-hub.html) | Sub-Hub grid for a shopping household with context chips, active-list badge, and FAB |
| Shopping List (Master) | [screens/shopping-list.html](screens/shopping-list.html) | Master List view with categorized items, bulk edit mode active (3 selected), EditModeToolbar, and add-item row |
| Active List | [screens/active-list.html](screens/active-list.html) | Active List with session progress bar, unchecked items at top and checked-off items below a divider, circle checkboxes |
| Tasks Hub | [screens/tasks-hub.html](screens/tasks-hub.html) | Tasks hub with pinned Urgent Tasks card (badge count 2), Sub-Hub grid, and FAB |
| Task Detail | [screens/task-detail.html](screens/task-detail.html) | Expanded task card with urgency strip (Critical), all fields (title, description, assignee, due date, notes, sub-hub), and action buttons |
| Vouchers Hub | [screens/vouchers-hub.html](screens/vouchers-hub.html) | Voucher card grid with expiry color-coding (green / amber / orange / red / expired), issuer label, value, and copy/image icons |
| Reservations Hub | [screens/reservations-hub.html](screens/reservations-hub.html) | Reservation card list with date block, event name, time, address, upcoming/past badges, and link/image icons |
| Settings | [screens/settings.html](screens/settings.html) | Full settings screen: user card, theme toggle, language toggle, Gmail connection status, invite partner, household members list, sign out, and Danger Zone |
