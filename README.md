# Secure Two-Tier CRUD Application on AWS

A portfolio project that deploys a Flask-based user and pet management application on **Amazon EC2**, backed by a **private Amazon RDS for PostgreSQL** database. Nginx acts as the public-facing reverse proxy, while Gunicorn runs the Flask application locally on the EC2 instance.

> **Project status:** Deployed and manually tested. The application supports Create, Read, Update and Delete operations against RDS. This is a learning/portfolio deployment, not a production-ready public service. It currently has no user authentication.

---

## Contents

- [Architecture](#architecture)
- [Features](#features)
- [Technology stack](#technology-stack)
- [AWS infrastructure](#aws-infrastructure)
- [Application request flow](#application-request-flow)
- [Repository structure](#repository-structure)
- [Run locally](#run-locally)
- [Deploy on EC2](#deploy-on-ec2)
- [Environment variables](#environment-variables)
- [API endpoints](#api-endpoints)
- [Validation and testing](#validation-and-testing)
- [Screenshots and demo](#screenshots-and-demo)
- [Security decisions and limitations](#security-decisions-and-limitations)
- [Cost and cleanup](#cost-and-cleanup)
- [Future improvements](#future-improvements)

---

## Architecture

The application is deployed in a custom VPC in the **Asia Pacific (Mumbai) region (`ap-south-1`)**.

![Secure two-tier AWS architecture](docs/architecture/architecture.png)

**High-level design:**

1. A browser sends HTTP traffic to the EC2 instance's public IPv4 address on port 80.
2. Nginx receives the request and reverse-proxies it to Gunicorn at `127.0.0.1:8000`.
3. Gunicorn serves the Flask application.
4. Flask connects to the RDS PostgreSQL endpoint on TCP port 5432.
5. RDS is deployed in private database subnets and has public accessibility disabled.

> Add the architecture image at `docs/architecture/architecture.png`, or change the image path above to match the actual filename committed to the repository.

## Features

- Single-page interface for managing user records and pet preferences.
- Create, read, update and delete (CRUD) operations without a full-page reload.
- Flask REST API returning JSON.
- PostgreSQL persistence through `psycopg2`.
- Parameterized SQL queries to reduce SQL injection risk.
- Client-side and server-side input validation.
- Delete confirmation modal.
- DOM updates using safe DOM APIs such as `textContent` and `createElement` for user-provided values.
- Environment-based configuration using `python-dotenv`.
- Nginx reverse proxy in front of Gunicorn.

## Technology stack

| Layer | Technology |
|---|---|
| Cloud | AWS |
| Region | Asia Pacific (Mumbai), `ap-south-1` |
| Network | Amazon VPC, public/private subnets, route tables, Internet Gateway |
| Compute | Amazon EC2, Ubuntu Server 24.04 LTS |
| Web server / reverse proxy | Nginx |
| WSGI application server | Gunicorn |
| Backend | Python, Flask |
| Database | Amazon RDS for PostgreSQL |
| Database driver | `psycopg2` / `psycopg2-binary` |
| Frontend | HTML, CSS, JavaScript Fetch API, Bootstrap 5 |
| Configuration | `python-dotenv` |
| Administration | AWS Systems Manager Session Manager |

---

## AWS infrastructure

### VPC and subnet plan

| Resource | CIDR / value | Purpose |
|---|---|---|
| VPC | `10.20.0.0/16` | Isolated project network |
| Public application subnet | `10.20.1.0/24` | EC2 application server |
| Private database subnet A | `10.20.11.0/24` | RDS subnet group |
| Private database subnet B | `10.20.12.0/24` | RDS subnet group in another AZ |
| Region | `ap-south-1` | Mumbai |

### Routing

**Public route table (`rtb-public-app`)**

| Destination | Target |
|---|---|
| `10.20.0.0/16` | Local |
| `0.0.0.0/0` | Internet Gateway |

The EC2 instance is in the public subnet and has a public IPv4 address for browser access.

**Private database route table (`rtb-private-db`)**

| Destination | Target |
|---|---|
| `10.20.0.0/16` | Local |

The database subnets have no default route to an Internet Gateway or NAT Gateway. A NAT Gateway was intentionally excluded from this initial build to reduce cost; it is not needed for the EC2-to-RDS connection over the VPC local route.

### Security groups

| Security group | Attached to | Inbound rule |
|---|---|---|
| `sg-app` | EC2 | HTTP TCP 80 from `0.0.0.0/0` |
| `sg-db` | RDS | PostgreSQL TCP 5432 from `sg-app` only |

- No inbound SSH rule is configured; administration uses Systems Manager Session Manager.
- RDS public accessibility is disabled.
- Gunicorn listens on `127.0.0.1:8000`; port 8000 is not intended to be exposed publicly.
- The EC2 security group's default outbound access was retained during initial setup. It can be restricted after documenting all required destinations.

### Compute and database

- EC2 runs Ubuntu Server 24.04 LTS in the public application subnet.
- Nginx listens on port 80 and proxies requests to Gunicorn.
- RDS for PostgreSQL runs in the private DB subnet group.
- The database security group accepts PostgreSQL connections only from the application security group.
- The application database is `flask_crud_db`.

---

## Application request flow

```text
Browser
  |
  | HTTP :80
  v
EC2 public IPv4
  |
  v
Nginx
  |
  | proxy_pass http://127.0.0.1:8000
  v
Gunicorn
  |
  v
Flask application
  |
  | PostgreSQL :5432
  v
Private Amazon RDS for PostgreSQL
```

This separates the public web entry point from the database. The database is not directly exposed to the internet.

---

## Repository structure

The application source directory is `flaskPostgreSQL/`. If this folder is nested inside a larger repository, preserve that parent folder in the paths below.

```text
repository/
├── README.md
├── network-plan.md
├── docs/
│   ├── architecture/
│   │   └── architecture.png
│   ├── screenshots/
│   │   ├── 01-ec2-session-manager.png
│   │   ├── 02-nginx-running.png
│   │   ├── 03-application-setup.png
│   │   ├── 04-private-rds-database.png
│   │   ├── 05-ec2-rds-connection.png
│   │   └── 06-application-live.png
│   └── demo/
│       └── demo-link.md
└── flaskPostgreSQL/
    ├── app.py
    ├── config.py
    ├── db.py
    ├── init_db.sql
    ├── requirements.txt
    ├── .env.example
    ├── .gitignore
    ├── templates/
    │   └── index.html
    ├── static/
    │   ├── css/
    │   │   └── style.css
    │   └── js/
    │       └── main.js
    └── tests/
        └── test_app.py
```

Adjust this tree if your actual Git repository has a different root layout. Do not commit the real `.env` file or the Python virtual environment.

---

## Run locally

### Prerequisites

- Python 3 installed.
- PostgreSQL available locally.
- Git.

### 1. Clone the repository and enter the application directory

```bash
git clone <YOUR_REPOSITORY_URL>
cd <REPOSITORY_DIRECTORY>/flaskPostgreSQL
```

If `flaskPostgreSQL` is the repository root, simply `cd` into the cloned directory.

### 2. Create and activate a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

On Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create the local database and schema

Create a PostgreSQL database named `flask_crud_db`, then apply the schema:

```bash
createdb flask_crud_db
psql -d flask_crud_db -f init_db.sql
```

The exact database creation command may differ depending on the local PostgreSQL installation and role configuration.

### 5. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with local database credentials. Do not commit `.env`.

### 6. Start the development application

Use the startup method supported by the current `app.py` and project configuration. For a Flask CLI setup, this may be:

```bash
flask --app app run --debug
```

If the project defines a supported `python app.py` entry point, use that instead. Do not use Flask's development server as the production server.

Open the local URL printed by Flask, commonly `http://127.0.0.1:5000` or the configured port.

---

## Deploy on EC2

The deployed layout used for this project was:

```text
/var/www/two-tier-app/
└── flaskPostgreSQL/
    ├── app.py
    ├── config.py
    ├── db.py
    ├── init_db.sql
    ├── requirements.txt
    ├── .env
    ├── venv/
    ├── templates/
    └── static/
```

The virtual environment and `.env` must remain on the server and must not be committed.

### Deployment outline

1. Launch Ubuntu EC2 in the public application subnet.
2. Attach an IAM role with the permissions needed for Systems Manager Session Manager.
3. Allow inbound HTTP on TCP 80 in `sg-app`; do not add public SSH access.
4. Install Git, Python, `python3-venv`, pip and Nginx.
5. Clone the repository and enter the application directory.
6. Create a virtual environment and install `requirements.txt`.
7. Create the RDS PostgreSQL instance in the private DB subnet group with public accessibility disabled.
8. Configure `sg-db` to accept TCP 5432 only from `sg-app`.
9. Apply `init_db.sql` to the application database.
10. Create the server-side `.env` with the RDS endpoint and credentials; restrict file permissions.
11. Run Gunicorn bound to `127.0.0.1:8000`.
12. Configure Nginx to proxy HTTP requests to Gunicorn.
13. Verify the application and CRUD operations through the EC2 public IPv4 address.

Example Nginx site configuration:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Validate and reload Nginx after configuring it:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Process management note:** During the initial deployment and troubleshooting, Gunicorn was started manually in a terminal. A systemd service is a recommended next improvement so Gunicorn can run in the background and restart automatically after a reboot. Do not describe systemd process management as implemented unless it has actually been configured and tested.

---

## Environment variables

Create `.env` from `.env.example`. Variable names must match those read by the application's `config.py`.

Example template (replace values locally; never commit real credentials):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flask_crud_db
DB_USER=your_database_user
DB_PASSWORD=replace_with_local_password
SECRET_KEY=replace_with_a_random_secret
FLASK_DEBUG=False
```

For EC2, set `DB_HOST` to the RDS endpoint and use the RDS database credentials. Use a unique secret key for the deployed environment.

Protect the server-side file:

```bash
chmod 600 .env
```

Check that Git ignores it:

```bash
git check-ignore .env
```

---

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Render the single-page application |
| `GET` | `/api/users` | Retrieve all user records |
| `GET` | `/api/users/<id>` | Retrieve one user |
| `POST` | `/api/users` | Create a user |
| `PUT` | `/api/users/<id>` | Update a user |
| `DELETE` | `/api/users/<id>` | Delete a user |

Example POST/PUT JSON body:

```json
{
  "fname": "John",
  "lname": "Smith",
  "pet": "Dog"
}
```

Allowed pet values in the application: `Dog`, `Cat`, `Rabbit`, `Bird`, `Other`.

---

## Validation and testing

The following were exercised during deployment:

- EC2 browser access through Nginx on port 80.
- Gunicorn serving Flask on the loopback interface.
- `GET /api/users` returning JSON from the RDS-backed application.
- PostgreSQL connectivity from EC2 to the private RDS endpoint.
- Creation, reading, updating and deletion through the browser UI.
- Frontend fixes for references to HTML elements that were not present.

Run the automated test suite locally (if dependencies and test configuration are installed):

```bash
python -m unittest discover -s tests
```

Do not claim all tests pass unless they have been run against the current committed version.

---

## Screenshots and demo

Store screenshots in the repository and embed them with relative Markdown paths:

### AWS infrastructure

![EC2 instance and deployment environment](docs/screenshots/01-ec2-session-manager.png)

![Private RDS database configuration](docs/screenshots/04-private-rds-database.png)

### Application running

![Application running through the EC2 public endpoint](docs/screenshots/06-application-live.png)

### Demo video

Add a public or unlisted video URL after recording:

- **Demo:** [Add demo video link](docs/demo/demo-link.md)

Only keep image references for files that have actually been added to the repository. Replace the example filenames above with your final screenshot filenames.

---

## Security decisions and limitations

### Implemented design choices

- RDS public accessibility is disabled.
- RDS is placed in private database subnets.
- `sg-db` allows PostgreSQL TCP 5432 from `sg-app`, not from the public internet.
- EC2 administration uses Systems Manager Session Manager rather than an inbound SSH rule.
- Gunicorn binds to `127.0.0.1:8000`; Nginx is the public HTTP entry point.
- SQL queries use parameterized statements.
- User-provided values are inserted into the DOM using safe DOM APIs rather than being interpreted as HTML.
- Secrets are supplied through environment variables and should not be committed.

### Known limitations

- The application does not implement user authentication or authorization. It is a portfolio demonstration and should not be used to store real or sensitive personal data.
- The initial deployment uses HTTP, not HTTPS. Add TLS and a domain name before treating it as an internet-facing service.
- The EC2 security group's outbound rule was left permissive during setup.
- Gunicorn was initially run manually; configure and test a systemd service for reliable process management.
- Monitoring, centralized logging, automated deployment and infrastructure as code are not yet part of this implementation.

---

## Cost and cleanup

AWS resources can continue to incur charges even when the application is not being used.

For a temporary pause, stop the EC2 instance and stop the RDS DB instance rather than terminating or deleting them. Stopping compute does not remove all charges: EBS volumes, RDS storage, retained backups/snapshots and other allocated resources may continue to incur costs. RDS may automatically restart after its supported stopped period.

Before deleting anything, decide whether the database and evidence are still needed. Take a backup if the data must be retained.

---

## Future improvements

- Configure Gunicorn with systemd and verify automatic startup after reboot.
- Add HTTPS using a domain name and TLS certificate.
- Restrict outbound security group rules based on required traffic.
- Add authentication and authorization before exposing user-specific data.
- Add CloudWatch monitoring, logs and alarms.
- Automate infrastructure with Terraform.
- Add CI/CD for tested deployments.
