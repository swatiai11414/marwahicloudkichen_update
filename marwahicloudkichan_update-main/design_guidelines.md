# HDOS Design Guidelines

## Design Approach

**Hybrid System Strategy**: This multi-tenant SaaS requires two distinct design languages:

1. **Admin Interfaces** (Super Admin & Shop Admin): Material Design-inspired system for consistency, clarity, and efficiency
2. **Customer-Facing Shop Pages**: Flexible, hospitality-focused design with customizable themes

Reference inspiration: Linear (admin panels), Airbnb (customer pages), Shopify (dashboard structure)

---

## Typography System

**Admin Interfaces:**
- Primary: Inter (400, 500, 600, 700)
- Headers: 24px/32px/40px (section titles/page headers)
- Body: 14px/16px (primary content)
- Small: 12px (metadata, labels)

**Customer Pages:**
- Primary: Plus Jakarta Sans (400, 600, 700) - warm, approachable
- Headers: 32px/40px/48px (shop name, section titles)
- Body: 16px/18px (menu items, descriptions)
- Price: 20px/24px (bold, prominent)

---

## Layout & Spacing System

**Spacing Scale**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-20
- Card gaps: gap-4 to gap-6

**Admin Layout Structure:**
- Fixed sidebar (280px width) with shop logo, navigation, role indicator
- Top bar (64px height) with breadcrumbs, search, profile dropdown
- Main content area with max-w-7xl container
- Two-column layouts for forms (labels left, inputs right)

**Customer Page Structure:**
- Full-width hero (60-80vh) with shop banner/logo
- Content sections with max-w-6xl centered
- Menu grid: 2 columns mobile, 3-4 desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Sticky order summary on larger screens

---

## Component Library

### Navigation & Controls
- **Admin Sidebar**: Vertical nav with icons (Heroicons), active state with accent background, collapsible groups
- **Top Bar**: Search input, notification bell, user avatar dropdown
- **Breadcrumbs**: Slash-separated navigation path
- **Tabs**: Underline style for switching views (Orders/Menu/Analytics)

### Data Display
- **Data Tables**: Striped rows, sortable columns, pagination controls, row actions (edit/delete icons)
- **Stat Cards**: Large number display (32px), label below, trend indicator (up/down arrow)
- **Order Cards**: Timeline-style with status badges, customer info, item list
- **Menu Item Cards**: Image top (16:9 ratio), title/price/description below, availability toggle

### Forms & Inputs
- **Text Inputs**: 44px height, rounded-lg borders, focus ring with accent color
- **Select Dropdowns**: Chevron icon right, search-enabled for long lists
- **Toggle Switches**: For availability, visibility settings
- **Image Upload**: Drag-drop zone with preview thumbnail
- **Phone Input**: Country code dropdown + number field

### Actions & Feedback
- **Primary Buttons**: Solid background, 44px height, rounded-lg, medium weight text
- **Secondary Buttons**: Outlined variant, same height
- **Icon Buttons**: 40px square, rounded-full for avatar actions
- **Toast Notifications**: Top-right position, auto-dismiss after 4s
- **Modal Dialogs**: Centered overlay, max-w-2xl, backdrop blur

### Page Builder Interface
- **Section Palette**: Left sidebar with draggable section types (Hero, Menu, Offers, etc.)
- **Canvas**: Center area showing live preview with section handles
- **Properties Panel**: Right sidebar for editing selected section (title, image, visibility toggle)
- **Section Cards**: Reorderable with drag handles, collapse/expand, quick visibility toggle

---

## Customer-Facing Shop Pages

### Dynamic Sections (No-Code System)

**Hero Section:**
- Full-width banner image (shop.banner_url) at 70vh
- Centered shop logo overlay (120px × 120px, white background, shadow)
- Shop name (48px bold) and tagline below logo
- Primary CTA button with blurred background (rgba blur)

**Menu Section:**
- Category tabs/pills for navigation
- Card grid layout (gap-6)
- Each item: Image (aspect-ratio-square), name (20px), description (14px muted), price (24px bold)
- "Add to Order" button or "Unavailable" badge

**Offers Section:**
- 2-column grid on desktop
- Offer cards with gradient backgrounds based on theme colors
- Title (24px), description, validity period, "Claim Offer" CTA

**Feedback/WhatsApp Section:**
- Split layout: Feedback form left, contact info right
- WhatsApp click-to-chat prominent button with icon

**QR Table Integration:**
- Small floating badge showing table number (fixed bottom-right)
- "View My Order" quick access button

---

## Theme Customization System

Each shop's theme_id controls:
- Primary color (CTA buttons, links, active states)
- Secondary color (section backgrounds, accents)
- Button style variations: rounded-full vs rounded-lg, solid vs outlined
- Font pairing (stored as theme presets)

**Theme Preview**: Live preview panel in admin showing all components with selected colors

---

## Admin Dashboard Layouts

### Super Admin Dashboard:
- 4-stat grid (Total Shops, Active Users, Revenue, Orders Today)
- Charts row: Line graph (7-day trend), pie chart (shop performance)
- Recent shops table with quick actions
- System health indicators

### Shop Admin Dashboard:
- 3-stat cards (Today's Orders, Active Menu Items, Total Customers)
- Quick actions: Add Menu Item, Create Offer, View Orders
- Live orders feed (auto-refresh) with status workflow
- Customer visit timeline

### Shop Settings Page:
- Tabbed interface: General, Theme, Sections, WhatsApp, Analytics
- General: Logo/banner upload, shop details form, operating hours
- Theme: Color pickers, preset gallery, font selector
- Sections: Drag-drop builder canvas
- WhatsApp: Number input, message templates editor

---

## Responsive Behavior

- **Mobile First**: Stack all columns, reduce padding by 50%
- **Tablet (768px+)**: 2-column layouts, show sidebar as drawer
- **Desktop (1024px+)**: Full multi-column, fixed sidebars, split views

---

## Images

**Admin Interfaces:**
- Shop logos/banners in settings (user-uploaded)
- Menu item photos (square aspect ratio)
- Placeholder illustrations for empty states (undraw.co style)

**Customer Pages:**
- **Hero Image**: Large banner showcasing shop ambiance (1920×1080 recommended)
- **Menu Items**: Product photography (square format, well-lit, consistent style)
- **Offer Cards**: Promotional graphics (can overlay theme gradients)
- **About Section**: Shop interior/team photos

---

## Accessibility & Polish

- All interactive elements 44px minimum touch target
- Form labels always visible (no placeholder-only inputs)
- Error states with red accent, success with green
- Loading states: Skeleton screens for tables, spinner for actions
- Keyboard navigation support throughout
- Focus indicators on all interactive elements