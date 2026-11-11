# Minimal Flask + PostgreSQL CRUD Application

A clean, minimal, and fully functional single-page web application built with **Python Flask** and **PostgreSQL**. The application allows users to create, read, update, and delete user records with their preferred pet without leaving or manually reloading the page.

---

## 1. Features

- **Single-Page Architecture:** Both the Add/Edit form and the live data table are displayed on the same page.
- **Full CRUD Support:**
  - **Create (POST):** Add a new user with First Name, Last Name, and Pet.
  - **Read (GET):** Display all records in an interactive responsive table.
  - **Update (PUT):** Select an existing record to populate the form, edit fields, and save changes. Includes a Cancel button to exit edit mode.
  - **Delete (DELETE):** Delete records with a confirmation prompt/modal to prevent accidental deletion.
- **SQL Injection Prevention:** All SQL queries use parameterized queries (`%s` placeholders via `psycopg2`).
- **Input Validation:** Client-side and server-side validation for required fields, lengths, and valid pet options.
- **Clean & Minimal UI:** Built with Bootstrap 5 and Bootstrap Icons for a modern, responsive layout without unnecessary bloat or complex dashboards.
- **RESTful JSON API:** Dedicated endpoints with standard HTTP status codes (`200`, `201`, `400`, `404`, `500`).

---

## 2. Technology Stack

- **Backend:** Python 3.10+, Flask
- **Database:** PostgreSQL (with `psycopg2-binary`)
- **Frontend:** HTML5, CSS3, JavaScript (Fetch API), Bootstrap 5
- **Configuration:** `python-dotenv` for environment management

---

## 3. Project Structure

```text
.
├── app.py                 # Flask server, route controllers, and API endpoints
├── config.py              # Environment and app configuration loader
├── db.py                  # PostgreSQL connection helper and parameterized CRUD queries
├── init_db.sql            # SQL script defining the users table schema
├── requirements.txt       # Python project dependencies
├── .env.example           # Template for environment configuration
├── .gitignore             # Standard git ignore file
├── templates/
│   └── index.html         # Main single-page interface (Form + Table)
├── static/
│   ├── css/
│   │   └── style.css      # Custom styling & badge themes
│   └── js/
│       └── main.js        # Frontend AJAX CRUD logic and DOM updates
└── tests/
    └── test_app.py        # Automated test suite for routes and CRUD logic
```

---

## 4. Database Schema

The application connects to a PostgreSQL database containing the `users` table:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    fname VARCHAR(100) NOT NULL,
    lname VARCHAR(100) NOT NULL,
    pet VARCHAR(50) NOT NULL
);
```

> **Note:** The application automatically runs `init_db()` upon startup to ensure the `users` table exists.

---

## 5. Prerequisites

Before running the application, make sure you have:

1. **Python 3.8+** installed:
   ```bash
   python --version
   ```
2. **PostgreSQL** installed and running on your system.

---

## 6. Installation & Setup Instructions

### Step 1: Clone or Navigate to the Project Directory
```bash
cd flaskPostgreSQL
```

### Step 2: (Optional but Recommended) Create a Virtual Environment
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### Step 3: Install Required Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Configure PostgreSQL Database
1. Open your PostgreSQL CLI (`psql`) or **pgAdmin**:
   ```bash
   psql -U postgres
   ```
2. Create a new database:
   ```sql
   CREATE DATABASE flask_crud_db;
   \q
   ```
3. *(Optional)* You can run `init_db.sql` manually or let Flask auto-create the table when it starts:
   ```bash
   psql -U postgres -d flask_crud_db -f init_db.sql
   ```

### Step 5: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
# On Windows PowerShell:
Copy-Item .env.example .env

# On Linux/macOS:
cp .env.example .env
```

Open `.env` and configure your PostgreSQL credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flask_crud_db
DB_USER=postgres
DB_PASSWORD=your_actual_password_here

PORT=5050
FLASK_DEBUG=True
```

---

## 7. Running the Application

Start the Flask development server:
```bash
python app.py
```

You should see output similar to:
```text
Database initialized: 'users' table is ready.
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5050
```

Open your browser and navigate to:
```
http://localhost:5050
```

---

## 8. REST API Endpoints

| Method | Endpoint | Description | Request Body | Response Status |
|---|---|---|---|---|
| `GET` | `/` | Renders the main user interface | None | `200 OK` |
| `GET` | `/api/users` | Retrieve all user records | None | `200 OK` |
| `GET` | `/api/users/<id>` | Retrieve a single user by ID | None | `200 OK` / `404 Not Found` |
| `POST` | `/api/users` | Create a new user record | `{"fname": "...", "lname": "...", "pet": "..."}` | `201 Created` / `400 Bad Request` |
| `PUT` | `/api/users/<id>` | Update an existing user | `{"fname": "...", "lname": "...", "pet": "..."}` | `200 OK` / `404 Not Found` |
| `DELETE` | `/api/users/<id>` | Delete a user by ID | None | `200 OK` / `404 Not Found` |

### Sample JSON Request (POST / PUT)
```json
{
  "fname": "John",
  "lname": "Smith",
  "pet": "Dog"
}
```

*Allowed `pet` values:* `Dog`, `Cat`, `Rabbit`, `Bird`, `Other`.

---

## 9. Running Automated Tests

To run the automated test suite:
```bash
python -m unittest discover -s tests
```
All route behaviors, validations, status codes, and error handlers are tested and verified.

