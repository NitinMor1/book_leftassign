# Bubble.io Implementation & Setup Blueprint
**Project:** Author Royalty Dashboard & Automated Notification System  
**Client:** BookLeaf Publishing  
**Platform:** Bubble.io (Free Plan compatible)  

---

## 1. Overview & Architecture in Bubble

The Bubble application consists of:
1. **Relational Database (`App data`)**: Cleanly separated `User`, `Author`, `Book`, and `NotificationLog` entities with foreign-key relationships.
2. **Two Isolated Portals**:
   - `author_portal`: Dedicated to authenticated authors (only sees their own catalog, consolidated royalty metrics, and book status badges).
   - `admin_portal`: Dedicated to operations personnel (full author table, search, multi-faceted filtering, author detail inspector, single & bulk n8n triggers, and live notification log).
3. **Privacy Rules**: Enforced at the database engine level so authors cannot inspect other authors' sales or books via network/inspect tools.
4. **API Connector**: Connects Bubble to the n8n automation backend with token-based security and timeout safeguards.

---

## 2. Database Schema Configuration (`Data > Data types`)

Set up the following four custom types in Bubble under **Data > Data types**:

### Type A: `User` (Bubble built-in)
| Field Name | Field Type | Description |
|---|---|---|
| `email` | text (built-in) | Login credential |
| `name` | text | Author or staff full name |
| `role` | text (or Option Set: `Admin`, `Author`) | Identifies authorization tier |
| `author_profile` | `Author` | Relational reference to the author's record |

### Type B: `Author`
| Field Name | Field Type | Description |
|---|---|---|
| `author_id` | text | Unique identifier (e.g., `AUTH001`) |
| `name` | text | Author's legal name |
| `email` | text | Primary correspondence address |
| `phone` | text | Contact telephone number |
| `city` | text | Location (e.g., Mumbai, Delhi, Bangalore) |
| `joined_date` | date | Onboarding date |
| `total_books` | number | Count of titles |
| `total_royalty_earned` | number | Cumulative earnings across all titles |
| `total_royalty_paid` | number | Cumulative payouts disbursed |
| `total_royalty_pending` | number | Outstanding balance awaiting payout |
| `payout_status` | text | Status category: `Fully Paid`, `Pending`, `Overdue` |
| `last_payout_date` | date | Date of most recent payout |

### Type C: `Book`
| Field Name | Field Type | Description |
|---|---|---|
| `book_id` | text | Unique title code (e.g., `BK001`) |
| `author` | `Author` | Relational link to the author |
| `author_id` | text | Foreign ID string for easy filtering |
| `author_name` | text | Cached author name |
| `title` | text | Book title |
| `isbn` | text | ISBN-13 identifier |
| `genre` | text | Classification genre |
| `publication_date` | date | Commercial go-live date |
| `status` | text | Production / live lifecycle state |
| `mrp` | number | Retail price in INR (₹) |
| `author_royalty_per_copy`| number | Contractual royalty rate per unit sold |
| `total_copies_sold` | number | Verified sales volume |
| `total_royalty_earned` | number | Lifetime earnings for this title |
| `royalty_paid` | number | Total payouts credited |
| `royalty_pending` | number | Pending balance |
| `last_royalty_payout_date`| date | Title's last disbursement date |
| `print_partner` | text | Facility: `In-House`, `Repro India`, etc. |
| `available_on` | text | Retail distribution channels |
| `royalty_status_badge` | text | Indicator color: `Green`, `Yellow`, `Red`, `Gray` |
| `status_explanation` | text | Human-readable explanation of status |

### Type D: `NotificationLog`
| Field Name | Field Type | Description |
|---|---|---|
| `log_id` | text | Unique execution ID |
| `author` | `Author` | Relational link |
| `author_id` | text | Author identifier |
| `author_name` | text | Author's name |
| `recipient_email` | text | Delivery address |
| `trigger_type` | text | `Manual Single` or `Bulk` |
| `triggered_at` | date | Timestamp initiated |
| `status` | text | `Pending`, `Success`, `Failed` |
| `email_subject` | text | AI-generated subject line |
| `email_preview` | text | Summary preview snippet |
| `email_content` | text | Full AI-generated body |
| `completed_at` | date | Completion timestamp |
| `error_message` | text | Failure details if encountered |

---

## 3. Importing Sample Dataset into Bubble (`App data`)

We have pre-formatted the official `bookleaf_sample_data.json` into four clean CSV files in the project's `data/` folder:

1. **Authors**: `data/bubble_import_authors.csv` (10 authors)
2. **Books**: `data/bubble_import_books.csv` (18 books with calculated aging & badges)
3. **Users**: `data/bubble_import_users.csv` (11 login credentials: 1 Admin + 10 Authors)
4. **Starter Logs**: `data/bubble_import_notification_logs.csv`

### How to Import into Bubble:
1. In your Bubble Editor, navigate to **Data > App data**.
2. Click on the **Author** data type in the left sidebar.
3. Click the **Upload** button (top right of table view).
4. Select `bubble_import_authors.csv`. Bubble will map the column headers automatically. Click **Upload data**.
5. Repeat the exact same step for **Book** using `bubble_import_books.csv`.
6. Repeat for **User** using `bubble_import_users.csv`.
7. Once imported, link the relational field:
   - For `User`: set `author_profile` = Search for Author where `author_id = User's author_id`.
   - For `Book`: set `author` = Search for Author where `author_id = Book's author_id`.

---

## 4. Privacy Rules Configuration (`Data > Privacy`)

To fulfill requirement **A4**, configure Bubble's Privacy Rules to guarantee strict data isolation:

### Rule Set 1: Data Type `Author`
- **Rule Name**: `Author Self Access`
  - **Condition**: `Current User's author_profile is This Author`
  - **Permissions**:
    - [x] View all fields
    - [x] Find this in searches
    - [ ] Allow auto-binding (leave unchecked)
- **Rule Name**: `Admin Full Access`
  - **Condition**: `Current User's role is "Admin"`
  - **Permissions**:
    - [x] View all fields
    - [x] Find this in searches
    - [x] Allow auto-binding
- **Everyone else (default)**:
  - [ ] View all fields (UNCHECK ALL)
  - [ ] Find this in searches (UNCHECK ALL)

### Rule Set 2: Data Type `Book`
- **Rule Name**: `Author Own Books Access`
  - **Condition**: `This Book's author_id is Current User's author_profile's author_id`
  - **Permissions**:
    - [x] View all fields
    - [x] Find this in searches
- **Rule Name**: `Admin Full Access`
  - **Condition**: `Current User's role is "Admin"`
  - **Permissions**:
    - [x] View all fields
    - [x] Find this in searches
- **Everyone else (default)**:
  - [ ] View all fields (UNCHECK ALL)
  - [ ] Find this in searches (UNCHECK ALL)

### Rule Set 3: Data Type `NotificationLog`
- **Rule Name**: `Admin Full Supervision`
  - **Condition**: `Current User's role is "Admin"`
  - **Permissions**:
    - [x] View all fields
    - [x] Find this in searches
- **Rule Name**: `Author Log Visibility`
  - **Condition**: `This NotificationLog's author_id is Current User's author_profile's author_id`
  - **Permissions**:
    - [x] View all fields
    - [x] Find this in searches

---

## 5. UI Page Design & Layout

You can create either two separate pages (`author_portal` and `admin_portal`) or a single responsive app with role-based routing upon login.

### Page 1: `author_portal` (Author View)
1. **Header**:
   - BookLeaf logo + Author Greeting ("Welcome back, `Current User's name`").
   - Logout button (Workflow: *Log the user out* -> redirect to `/login`).
2. **Consolidated Royalty Summary Card (Hero Section)**:
   - 3 Stat Boxes:
     - **Lifetime Earned**: `₹ Current User's author_profile's total_royalty_earned:formatted as 1,000`
     - **Royalties Paid**: `₹ Current User's author_profile's total_royalty_paid:formatted as 1,000`
     - **Pending Balance**: `₹ Current User's author_profile's total_royalty_pending:formatted as 1,000`
   - **Payout Status Alert Banner**:
     - Conditional Green banner if pending = 0 ("All royalties are settled").
     - Conditional Yellow banner if pending > 0 & normal cycle ("Scheduled for upcoming quarterly cycle").
     - Conditional Red banner if overdue ("Our finance operations team is actively expediting your statement").
3. **Repeating Group: "My Books"**:
   - **Type of content**: `Book`
   - **Data source**: `Search for Books` where `author_id = Current User's author_profile's author_id`
   - **Columns / Cell Content**:
     - Title & ISBN
     - Genre & Publication Date
     - MRP & Author Royalty Per Copy
     - Total Copies Sold
     - Lifetime Earned & Royalty Paid
     - Royalty Pending Balance
     - Last Payout Date
     - Platform Availability badges (Amazon, Flipkart, BookLeaf Store)
     - **Royalty Status Indicator Badge**:
       - Green Badge: `This Book's royalty_status_badge is "Green"` (Background: `#DEF7EC`, Text: `#03543F`, Label: "Settled / Paid")
       - Yellow Badge: `This Book's royalty_status_badge is "Yellow"` (Background: `#FEF08A`, Text: `#713F12`, Label: "Pending (In Cycle)")
       - Red Badge: `This Book's royalty_status_badge is "Red"` (Background: `#FDE8E8`, Text: `#9B1C1C`, Label: "Action Overdue")
       - Gray Badge: `This Book's royalty_status_badge is "Gray"` (Background: `#F3F4F6`, Text: `#374151`, Label: "In Production")

---

### Page 2: `admin_portal` (BookLeaf Operations View)
1. **Header & High-Level KPIs**:
   - Total Authors in Network (10)
   - Total Pending Royalty Liabilities (`Search for Authors's total_royalty_pending:sum`)
   - Bulk Action Button: **"Bulk Trigger: Send Royalty Summaries to All Pending Authors"**
2. **Filters & Search Bar**:
   - **Search Input**: "Search author by name..." (Input type: Text)
   - **City Dropdown**: Choices: `All Cities`, `Mumbai`, `Delhi`, `Hyderabad`, `Pune`, `Kochi`, `Chandigarh`, `Bangalore`, `Lucknow`, `Nagpur`, `Kolkata`.
   - **Payout Status Dropdown**: Choices: `All Statuses`, `Fully Paid`, `Pending`, `Overdue`.
3. **Authors Repeating Group**:
   - **Data source**: `Search for Authors` with dynamic constraints:
     - `name contains Input Search's value` (when Input Search is not empty)
     - `city = Dropdown City's value` (when Dropdown City is not "All Cities")
     - `payout_status = Dropdown Status's value` (when Dropdown Status is not "All Statuses")
   - **Columns**: Author Name, City, Total Titles, Earned, Paid, Pending, Payout Status badge, Action button: **"View Details & Manage"**.
4. **Author Detail Modal / Inspector Drawer**:
   - Opens when "View Details" is clicked for a row (sets custom state `SelectedAuthor = Current cell's Author`).
   - Displays author's full book catalog repeating group with individual sales numbers and dates.
   - Primary Action Button: **"Generate & Send Royalty Summary"**
     - Clicking button triggers the API Connector workflow to n8n.
     - Displays button loading spinner (`This button isn't clickable while workflow is running`).
     - Success alert toast: "Royalty summary queued & processed via n8n!"
5. **Notification Log Table**:
   - **Type of content**: `NotificationLog`
   - **Data source**: `Search for NotificationLogs` sorted by `triggered_at` descending.
   - **Columns**: Author Name, Recipient Email, Trigger Type, Status (`Success` green pill / `Failed` red pill), Subject, Completed Timestamp, Action: "View Email Body Modal".

---

## 6. Configuring Bubble API Connector for n8n

1. In Bubble Editor, install the official free plugin **API Connector**.
2. Add a new API named **"n8n Workflow Backend"**.
3. Configure the call:
   - **Name**: `Trigger Royalty Summary`
   - **Use as**: `Action`
   - **Data type**: `JSON`
   - **Method**: `POST`
   - **URL**: `https://<YOUR_N8N_INSTANCE_OR_NGROK>/webhook/bookleaf-royalty-summary`
   - **Headers**:
     - `Content-Type`: `application/json`
     - `X-BookLeaf-Secret`: `bookleaf_secure_webhook_secret_2026`
   - **Body (JSON)**:
     ```json
     {
       "auth_token": "bookleaf_secure_webhook_secret_2026",
       "log_id": "<log_id>",
       "author_id": "<author_id>",
       "author_name": "<author_name>",
       "author_email": "<author_email>",
       "author_city": "<author_city>",
       "trigger_type": "Manual Single",
       "bubble_callback_url": "https://<your-app>.bubbleapps.io/version-test/api/1.1/obj/notificationlog/<log_id>"
     }
     ```
   - Click **Initialize Call** with sample test parameters (`AUTH001`, `Priya Sharma`, etc.).
   - Verify that the call returns `200 OK` with `{ "success": true, "status": "Success" }`.

---

## 7. Bubble Workflows Setup

### Workflow 1: Single Author "Generate & Send Royalty Summary"
1. **Trigger**: When Button "Generate & Send" is clicked.
2. **Step 1 - Create a new thing**:
   - Type: `NotificationLog`
   - `author_id` = `SelectedAuthor's author_id`
   - `author_name` = `SelectedAuthor's name`
   - `recipient_email` = `SelectedAuthor's email`
   - `trigger_type` = `"Manual Single"`
   - `triggered_at` = `Current date/time`
   - `status` = `"Pending"`
3. **Step 2 - Call n8n Webhook**:
   - Call API: `n8n Workflow Backend - Trigger Royalty Summary`
   - Pass `log_id` = `Result of Step 1's Unique ID`
   - Pass `author_id` = `SelectedAuthor's author_id`
   - Pass `author_name` = `SelectedAuthor's name`
   - Pass `author_email` = `SelectedAuthor's email`
   - Pass `author_city` = `SelectedAuthor's city`
4. **Step 3 - Make changes to thing**:
   - Thing to change: `Result of Step 1 (NotificationLog)`
   - `status` = `Result of Step 2's status` (or `"Success"`)
   - `email_subject` = `Result of Step 2's email_subject`
   - `email_preview` = `Result of Step 2's email_preview`
   - `email_content` = `Result of Step 2's email_content`
   - `completed_at` = `Current date/time`
5. **Step 4 - Show Alert**:
   - Alert message: "Royalty summary generated & sent successfully!"

### Workflow 2: "Bulk Trigger for All Pending Authors"
1. **Trigger**: When Button "Bulk Trigger" is clicked.
2. **Step 1 - Schedule API Workflow on a list**:
   - List to run on: `Search for Authors` where `total_royalty_pending > 0`
   - API Workflow: `send_author_summary`
   - Parameter `author`: `This Author`
   - (Alternatively, trigger sequentially or send list payload to n8n).
3. **Step 2 - Show Alert**:
   - "Bulk royalty processing initiated for eligible authors."

---

## 8. Summary of Test Accounts

| Persona | Email | Password | Role | Description |
|---|---|---|---|---|
| **Operations Admin** | `nitinnitin29895@gmail.com` | `AdminPassword123!` | Admin | Supervises all 10 authors, filters catalog, triggers n8n summaries |
| **Author 1 (Overdue)** | `priya.sharma@email.com` | `AuthorPassword123!` | Author | 2 books, pending ₹3,570, Red overdue badge |
| **Author 2 (Mixed)** | `rohit.kapoor@email.com` | `AuthorPassword123!` | Author | 2 books, pending ₹13,024, Red and Yellow badges |
| **Author 3 (In-Production)**| `sneha.kulkarni@email.com`| `AuthorPassword123!` | Author | 3 books (1 In-Production), pending ₹7,865 |
| **Author 4 (Fully Settled)**| `farhan.sheikh@email.com` | `AuthorPassword123!` | Author | 1 book, pending ₹0, Green settled badge |
