# LEGAL DOCUMENT AUTOMATION PLATFORM
# UI BUILD SPECIFICATION

## For Lovable / Bolt.new / v0 / Google AI Studio / AI UI Builders

**Version:** 1.0  
**Status:** MVP  
**Primary goal:** Build the complete frontend experience for the MVP  
**Audience:** UI-generation and frontend coding agents

---

# 1. PRODUCT CONTEXT

We are building a legal document automation platform for advocates, lawyers, clerks, chambers, and small law firms.

The core product promise is:

> **Upload a legal document. The system identifies the case, extracts important information, and files it automatically.**

The MVP is NOT a generic cloud drive.

The primary workflow is:

```text
UPLOAD
   ↓
PROCESS
   ↓
IDENTIFY CASE
   ↓
CONFIRM IF NECESSARY
   ↓
FILE
   ↓
SEARCH / RETRIEVE
```

The most important UX principle is:

> **The user should not have to decide where a document belongs.**

The original product concept identifies automatic case identification and filing as the initial product wedge.

---

# 2. WHAT YOU ARE BUILDING

Build a polished, production-quality web application frontend for the MVP.

The frontend should feel like a serious professional legal product.

It should NOT look like:

- a generic AI chatbot
- a generic SaaS template
- a developer dashboard
- a cloud storage clone
- an overly futuristic "AI" interface

It should feel:

- trustworthy
- calm
- fast
- professional
- information-dense but not cluttered
- optimized for repeated daily use

The user should feel:

> "I can trust this with my case documents."

---

# 3. MVP SCREENS

Build these screens:

1. Login
2. Sign up
3. Dashboard / Home
4. Cases
5. Case Detail
6. Upload
7. Document Processing
8. Match Confirmation
9. Search
10. Search Results
11. Document Viewer
12. Settings
13. Basic user/organization management

Do NOT build:

- billing
- CRM
- calendar
- advanced analytics
- legal advice chatbot
- WhatsApp integration
- Telegram integration
- mobile app
- enterprise administration
- advanced AI agent UI

---

# 4. GLOBAL NAVIGATION

Desktop-first MVP.

Recommended layout:

```text
┌──────────────────────────────────────────────────────┐
│ Logo                                  User / Avatar   │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│ Home         │                                       │
│ Cases        │             MAIN CONTENT              │
│ Search       │                                       │
│ Upload       │                                       │
│              │                                       │
│              │                                       │
│ Settings     │                                       │
│              │                                       │
└──────────────┴───────────────────────────────────────┘
```

Sidebar:

- Home
- Cases
- Search
- Upload

Bottom:

- Settings
- User profile

The **Upload** action should always be visually prominent.

---

# 5. VISUAL DIRECTION

## Overall aesthetic

Use a modern professional SaaS aesthetic.

Think:

- premium legal software
- Linear-like cleanliness
- Notion-like clarity
- Stripe-like polish
- restrained enterprise design

Avoid:

- excessive gradients
- glowing AI effects
- neon colors
- huge illustrations
- excessive rounded cards
- cartoon imagery
- unnecessary animations

---

# 6. COLOR SYSTEM

Use a restrained neutral palette.

Primary:

- near-black / dark navy text
- white background
- light neutral surfaces
- subtle borders

Use one restrained accent color for:

- primary buttons
- links
- active navigation
- important status

Semantic colors:

- green = successful / filed
- amber = requires attention
- red = error / destructive
- gray = processing / neutral

Do not use color as the only indicator of status.

---

# 7. TYPOGRAPHY

Prioritize readability.

Suggested hierarchy:

```text
Page title
28–32px

Section heading
18–22px

Body
14–16px

Metadata
12–14px

Labels
12–13px
```

Legal document metadata should be highly readable.

---

# 8. DASHBOARD

The home screen should answer:

> "What is happening with my documents?"

Example:

```text
Good evening, Amit

What would you like to do?

┌───────────────────────────────────────────┐
│                                           │
│          Upload a legal document          │
│                                           │
│      Drop a PDF here or choose a file     │
│                                           │
│             [ Upload Document ]           │
│                                           │
│     No need to select a case first.       │
│                                           │
└───────────────────────────────────────────┘

Recent Cases

Rajesh Kumar vs State
WP 1234/2025
12 documents · Updated today

Suresh Kumar vs ABC Ltd
WP 882/2024
34 documents · Updated yesterday
```

---

# 9. UPLOAD EXPERIENCE

This is the most important screen.

The UI should communicate:

> **You don't need to know where this belongs.**

Example:

```text
Upload document

┌───────────────────────────────────────────┐
│                                           │
│             Drop PDF here                 │
│                                           │
│                 or                        │
│                                           │
│           [ Choose PDF ]                  │
│                                           │
│   We'll identify the case automatically.  │
│                                           │
└───────────────────────────────────────────┘
```

Optional:

```text
Add a note (optional)
__________________________
```

Do NOT ask for:

- case
- folder
- document type
- date

before processing.

---

# 10. UPLOAD STATES

Design all states.

## Empty

```text
Drop PDF here
or choose a file
```

## Dragging

Clearly show that the file can be dropped.

## Uploading

```text
Uploading...
██████████████░░░░
```

## Processing

```text
Processing document

✓ Document uploaded
✓ Text extracted
✓ Information detected

● Identifying case...
```

## Success

Transition into match result.

## Error

```text
We couldn't process this document.

The original file is safe.

[Try again]
[View document]
```

---

# 11. MATCH CONFIRMATION

This is the most important product interaction.

Example:

```text
Document processed

COURT ORDER

08 Aug 2026

We think this document belongs to:

┌───────────────────────────────────────────┐
│ Rajesh Kumar vs State                     │
│ WP 1234/2025                              │
│ Allahabad High Court                      │
│                                           │
│ Match confidence                          │
│ High                                      │
│                                           │
│ Why we think this                         │
│ ✓ Case number matches                     │
│ ✓ Party name matches                      │
│ ✓ Court matches                           │
└───────────────────────────────────────────┘

[ Confirm & File ]

Choose another case
```

---

# 12. HIGH-CONFIDENCE STATE

When confidence is high, make the experience extremely fast.

Example:

```text
✓ Ready to file

Rajesh Kumar vs State
WP 1234/2025

Court Order · 08 Aug 2026

[ File Document ]
```

The system should not make users navigate through unnecessary screens.

---

# 13. AMBIGUOUS MATCH STATE

If multiple cases are possible:

```text
We found a few possible matches

Which case does this belong to?

○ Rajesh Kumar vs State
  WP 1234/2025
  Allahabad High Court

○ Rajesh Kumar vs ABC Ltd
  WP 882/2024
  Delhi High Court

○ Rajesh Kumar vs XYZ
  WP 441/2023

[ Continue ]
```

Use radio selection or cards.

Make the differences between candidates immediately visible.

---

# 14. NO MATCH STATE

```text
We couldn't identify the case

We couldn't confidently match this document
to an existing case.

[ Choose Existing Case ]

[ Create New Case ]
```

Never make the user feel that the system failed catastrophically.

---

# 15. DOCUMENT METADATA

After processing, display:

```text
Document type
Court Order

Document date
08 Aug 2026

Case number
WP 1234/2025

Court
Allahabad High Court

Parties
Rajesh Kumar
State of Uttar Pradesh
```

Allow editing.

Important:

The UI should distinguish:

- extracted
- AI-detected
- user-confirmed

Do not make uncertain AI output look like verified fact. The source product specifically calls for separating extracted facts, AI interpretations, and user-confirmed facts.

---

# 16. CASES SCREEN

Display a clean searchable table/list.

```text
Cases

[ Search cases... ]

+---------------------------------------------+
| Case                         | Documents    |
+---------------------------------------------+
| Rajesh Kumar vs State        | 42           |
| WP 1234/2025                 |              |
| Allahabad High Court         | Updated today|
+---------------------------------------------+
| Suresh Kumar vs ABC Ltd      | 18           |
| WP 882/2024                  |              |
| Delhi High Court             | Yesterday   |
+---------------------------------------------+
```

Allow sorting by:

- name
- last updated
- document count

---

# 17. CASE DETAIL

Example:

```text
← Cases

RAJESH KUMAR VS STATE
WP 1234/2025
Allahabad High Court

[ Upload Document ]

42 documents
Updated today

[ Search this case... ]

Documents

Orders             8
Pleadings          5
Evidence           11
Applications       7
Affidavits         4
Correspondence     13
Other              1
```

Below:

```text
Recent Documents

08 Aug 2026
Court Order
08-Aug-2026_Court-Order_WP-1234-2025.pdf

21 Apr 2026
Evidence
Evidence-04.pdf
```

---

# 18. DOCUMENT LIST

Each document row should show:

- document type
- title
- date
- case
- uploaded date
- status

Example:

```text
Court Order
08-Aug-2026_Court-Order_WP-1234-2025.pdf
08 Aug 2026

[Open]
```

Avoid clutter.

---

# 19. SEARCH

Search should be a first-class feature.

Screen:

```text
Search documents

┌─────────────────────────────────────────────┐
│ Rajesh Kumar latest order               🔍 │
└─────────────────────────────────────────────┘

42 results
```

Filters:

- Case
- Document type
- Court
- Date
- Uploaded by

---

# 20. SEARCH RESULTS

Show contextual excerpts.

Example:

```text
Court Order
08 Aug 2026

Rajesh Kumar vs State
WP 1234/2025

"...the court considered the applicability
of Section 138..."

[Open document]
```

Search should feel significantly better than browsing folders.

---

# 21. DOCUMENT VIEWER

Layout:

```text
┌─────────────────────────────────────────────┐
│ ← Back                         Download      │
├───────────────────────┬─────────────────────┤
│                       │ Document             │
│                       │                     │
│                       │ Court Order          │
│       PDF             │                     │
│       VIEWER          │ Case                 │
│                       │ Rajesh Kumar vs State│
│                       │                     │
│                       │ Date                 │
│                       │ 08 Aug 2026          │
│                       │                     │
│                       │ Type                 │
│                       │ Court Order          │
└───────────────────────┴─────────────────────┘
```

Desktop should use a two-column layout.

---

# 22. DOCUMENT PROCESSING UI

Make processing feel understandable.

Use a stepper:

```text
Upload
  ✓

Read document
  ✓

Extract information
  ✓

Identify case
  ●

File document
  ○
```

Avoid showing technical details such as:

- model name
- token counts
- embeddings
- API calls
- internal confidence math

The user cares about the result.

---

# 23. SETTINGS

Keep MVP settings minimal.

Sections:

### Organization

- Organization name

### Profile

- Name
- Email

### Users

- User list
- Invite user

### Security

- Change password
- Sessions

### Preferences

- Filename format
- Default document behavior

Do not build an enormous settings system.

---

# 24. EMPTY STATES

Every major screen needs a useful empty state.

### No cases

```text
No cases yet

Create your first case to start organizing
legal documents automatically.

[ Create Case ]
```

### No documents

```text
No documents yet

Upload a legal document and we'll organize it
automatically.

[ Upload Document ]
```

### No search results

```text
No documents found

Try searching by:
- case number
- party name
- document type
- phrase from the document
```

---

# 25. TOASTS / FEEDBACK

Use concise feedback.

Success:

> Document filed successfully.

Error:

> We couldn't process this document.

Correction:

> Document moved to Rajesh Kumar vs State.

Upload:

> Document uploaded.

Avoid overly verbose notifications.

---

# 26. RESPONSIVE BEHAVIOR

The MVP is desktop-first but should be usable on tablet/mobile widths.

Desktop:

- persistent sidebar
- two-column document viewer
- tables

Mobile:

- collapsible navigation
- stacked cards
- full-width upload
- simplified document viewer

Do not attempt to make the web MVP a full native mobile experience.

---

# 27. COMPONENT SYSTEM

Build reusable components:

- Button
- Input
- SearchInput
- Select
- Modal
- Drawer
- Toast
- Badge
- StatusBadge
- CaseCard
- CaseRow
- DocumentRow
- DocumentCard
- MetadataField
- UploadDropzone
- ProcessingStepper
- MatchCandidate
- ConfidenceIndicator
- EmptyState
- ErrorState
- PDFViewer
- Sidebar
- Header
- DataTable

The UI should use a consistent design system rather than page-specific styling.

---

# 28. REQUIRED INTERACTION STATES

Every interactive component must support:

- default
- hover
- focus
- active
- disabled
- loading
- success
- error

Forms must have validation states.

---

# 29. ACCESSIBILITY

Implement:

- keyboard navigation
- visible focus states
- semantic HTML
- labels for form controls
- accessible modals
- accessible buttons
- sufficient contrast
- non-color status indicators

---

# 30. MOCK DATA

Until backend APIs are connected, use realistic mock data.

Create at least:

### Cases

```text
Rajesh Kumar vs State
WP 1234/2025
Allahabad High Court

Suresh Kumar vs ABC Ltd
WP 882/2024
Delhi High Court

Anita Sharma vs XYZ
WP 441/2024
Lucknow Bench
```

### Documents

Use realistic examples:

- Court Order
- Petition
- Affidavit
- Application
- Evidence
- Notice
- Reply

Do not use generic "Lorem ipsum" data.

---

# 31. IMPORTANT DEMO FLOW

The UI must support this end-to-end demo:

```text
Dashboard
   ↓
Click Upload
   ↓
Select:
08-Aug-2026-order.pdf
   ↓
Processing animation
   ↓
System detects:

Rajesh Kumar vs State
WP 1234/2025
Court Order
08 Aug 2026
96% confidence
   ↓
Confirm
   ↓
Success:
"Document filed"
   ↓
Case detail opens
   ↓
Document appears in Orders
   ↓
Search for "Rajesh Kumar"
   ↓
Document appears
   ↓
Open PDF
```

This flow is the primary MVP demo.

---

# 32. UX RULES

## Rule 1

Never ask the user to select a case before upload.

## Rule 2

Never make metadata mandatory if the system can infer it.

## Rule 3

Always make uncertainty visible.

## Rule 4

Never hide the original document.

## Rule 5

Search should be easier than folder navigation.

## Rule 6

The primary action should always be obvious.

## Rule 7

The interface should feel fast even when AI processing takes time.

## Rule 8

Avoid "AI magic" language.

Say:

> "We found a likely match."

Not:

> "Our advanced AI has intelligently determined..."

---

# 33. UI QUALITY BAR

Before considering the frontend complete, verify:

- no broken layouts
- no placeholder text
- no generic lorem ipsum
- no inconsistent spacing
- no inconsistent buttons
- no unexplained icons
- all loading states work
- all error states work
- all empty states work
- keyboard navigation works
- responsive layout works
- primary upload flow feels fast
- match confirmation is understandable within 5 seconds

---

# 34. FRONTEND IMPLEMENTATION INSTRUCTION

When generating the application:

1. Build the complete UI structure.
2. Use reusable components.
3. Use realistic legal data.
4. Implement client-side state for the entire demo flow.
5. Abstract API calls behind service functions.
6. Do not hard-code UI directly to mock data everywhere.
7. Keep backend integration replaceable.
8. Make upload → processing → match → filing a working interactive flow.
9. Make search and case navigation functional with mock data.
10. Ensure the application can later connect to the backend MVP specification.

---

# 35. DO NOT IMPLEMENT BACKEND LOGIC IN THE UI

The frontend should assume APIs such as:

```text
POST /api/documents
GET  /api/documents/:id
GET  /api/documents/:id/status

GET  /api/cases
POST /api/cases
GET  /api/cases/:id

POST /api/documents/:id/confirm-match
POST /api/documents/:id/reassign

GET /api/search
```

These are illustrative contracts.

The engineering implementation may modify them, but the frontend should be structured around this separation.

---

# 36. FINAL UI GOAL

The entire product should communicate one idea:

> **"Give us the document. We'll take care of the filing."**

The user should spend almost no time thinking about folders, filenames, metadata, or document routing.

The interface is successful when the automation feels **quiet, obvious, trustworthy, and fast**.