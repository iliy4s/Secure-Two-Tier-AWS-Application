# Network Plan — Secure Two-Tier AWS Application

**Document purpose:** Record the intended network design and the configuration implemented for the Flask application on EC2 with a private Amazon RDS for PostgreSQL database.

**Implementation status:** Core network and database connectivity have been deployed and manually validated. This document describes the design and the known implementation. Update it if the AWS console configuration changes.

---

## 1. Project configuration

| Item | Configuration |
|---|---|
| AWS Region | Asia Pacific (Mumbai), `ap-south-1` |
| VPC CIDR | `10.20.0.0/16` |
| Public application subnet | `10.20.1.0/24` |
| Private database subnet A | `10.20.11.0/24` |
| Private database subnet B | `10.20.12.0/24` |
| Application compute | Amazon EC2, Ubuntu Server 24.04 LTS |
| Web entry point | Nginx on TCP 80 |
| Application server | Gunicorn bound to `127.0.0.1:8000` |
| Backend | Python Flask |
| Database | Amazon RDS for PostgreSQL |
| Database port | TCP 5432 |
| Administration | AWS Systems Manager Session Manager |

The EC2 instance is deployed in the public application subnet. RDS uses a DB subnet group containing the two private database subnets and has public accessibility disabled.

## 2. VPC and subnet layout

```text
VPC: 10.20.0.0/16
|
+-- Public application subnet: 10.20.1.0/24
|   +-- EC2 application server
|       +-- Nginx :80
|       +-- Gunicorn :8000 (loopback only)
|       +-- Flask application
|
+-- Private database subnet A: 10.20.11.0/24
|
+-- Private database subnet B: 10.20.12.0/24
    +-- RDS DB subnet group spans the two private subnets
```

The two DB subnets should be in different Availability Zones to satisfy the RDS DB subnet group requirement. The RDS DB instance itself was configured as Single-AZ for this cost-conscious project.

## 3. Route table configuration

### 3.1 Public route table

**Name:** `rtb-public-app`

**Associated subnet:** Public application subnet `10.20.1.0/24`

| Destination | Target | Purpose |
|---|---|---|
| `10.20.0.0/16` | `local` | VPC-internal communication |
| `0.0.0.0/0` | Internet Gateway (IGW) | Internet routing for the public subnet |

Expected behavior:
- Browser traffic can reach EC2 on TCP 80 when the security group allows it.
- EC2 can make outbound internet connections when it has a public IPv4 address and outbound traffic is permitted.
- The Internet Gateway provides routing; security groups still control whether traffic is allowed.

### 3.2 Private database route table

**Name:** `rtb-private-db`

**Associated subnets:**
- Private database subnet A — `10.20.11.0/24`
- Private database subnet B — `10.20.12.0/24`

| Destination | Target | Purpose |
|---|---|---|
| `10.20.0.0/16` | `local` | VPC-internal communication |

The private database route table has no default route to an Internet Gateway or NAT Gateway.

**Cost/design decision:** A NAT Gateway was excluded from this initial implementation to avoid its hourly and data-processing costs. EC2-to-RDS traffic uses the VPC local route and does not require a NAT Gateway.

## 4. Security group configuration

### 4.1 Application security group — `sg-app`

**Attached resource:** EC2 application server.

Inbound:

| Type | Protocol | Port | Source | Purpose |
|---|---|---:|---|---|
| HTTP | TCP | 80 | `0.0.0.0/0` | Public browser access to Nginx |

No inbound SSH rule is configured. Administration is performed using Systems Manager Session Manager, which requires the appropriate EC2 IAM role, SSM Agent and network connectivity to Systems Manager endpoints.

Outbound:

| Rule | Protocol | Port | Destination | Purpose |
|---|---|---:|---|---|
| Default outbound rule retained during setup | All | All | `0.0.0.0/0` | Package installation and required outbound connections |

The permissive outbound rule is an initial setup choice, not a final least-privilege policy. Restrict it after documenting all required destinations and validating SSM and package access.

### 4.2 Database security group — `sg-db`

**Attached resource:** Amazon RDS for PostgreSQL.

Inbound:

| Type | Protocol | Port | Source | Purpose |
|---|---|---:|---|---|
| PostgreSQL | TCP | 5432 | `sg-app` | Allow database connections from the application server |

Do not add a rule allowing `0.0.0.0/0` or a public IP range to connect to PostgreSQL.

The default outbound rule was retained during setup. The critical inbound restriction is the source security group reference to `sg-app`.

## 5. Application and database traffic flow

```text
Browser
  |
  | HTTP / TCP 80
  v
EC2 public IPv4
  |
  v
Nginx (EC2)
  |
  | Reverse proxy to 127.0.0.1:8000
  v
Gunicorn
  |
  v
Flask application
  |
  | PostgreSQL / TCP 5432
  v
RDS PostgreSQL endpoint
  |
  | RDS is in private DB subnets
  v
Private database network
```

Detailed request path:

1. The user opens the EC2 public IPv4 address over HTTP.
2. The public subnet route table provides the route through the Internet Gateway.
3. `sg-app` permits inbound TCP 80.
4. Nginx receives the HTTP request and forwards it to Gunicorn on `127.0.0.1:8000`.
5. Gunicorn invokes the Flask application.
6. Flask connects to the RDS endpoint on TCP 5432.
7. The VPC local route provides internal routing between the application and database subnets.
8. `sg-db` permits the connection because its inbound rule references `sg-app`.
9. RDS returns the database response over the established connection.

## 6. Database subnet group and RDS connectivity

The RDS DB subnet group contains:
- `10.20.11.0/24`
- `10.20.12.0/24`

These subnets should reside in different Availability Zones.

RDS configuration:
- Engine: PostgreSQL.
- Initial application database: `flask_crud_db`.
- Public accessibility: **No**.
- Port: TCP 5432.
- Security group: `sg-db`.
- Deployment: Single-AZ for the initial portfolio build.

The RDS endpoint is a DNS name. Do not hard-code a changing IP address in the application configuration. Supply the endpoint through the server-side `DB_HOST` environment variable.

## 7. Administration and access

EC2 administration uses AWS Systems Manager Session Manager rather than public SSH.

Required elements:
- An EC2 instance profile/role with `AmazonSSMManagedInstanceCore` or equivalent required permissions.
- A functioning SSM Agent.
- Network access from EC2 to the Systems Manager endpoints.

The EC2 instance has a public IPv4 address for the HTTP demonstration. The database does not have public accessibility enabled.

## 8. Validation checklist

Use this checklist when recreating or reviewing the environment.

### VPC and routing
- [ ] VPC CIDR is `10.20.0.0/16`.
- [ ] Public subnet is `10.20.1.0/24`.
- [ ] Private DB subnets are `10.20.11.0/24` and `10.20.12.0/24`.
- [ ] Public subnet is associated with `rtb-public-app`.
- [ ] Private DB subnets are associated with `rtb-private-db`.
- [ ] Public route table has a default route to the Internet Gateway.
- [ ] Private DB route table has no default internet route.

### Security
- [ ] `sg-app` permits inbound TCP 80 as intended.
- [ ] No inbound SSH rule is configured.
- [ ] Session Manager access works.
- [ ] `sg-db` permits TCP 5432 only from `sg-app`.
- [ ] RDS public accessibility is disabled.
- [ ] Gunicorn listens on loopback, not on a public interface.
- [ ] No database credentials or `.env` contents are committed to Git.

### Connectivity and application
- [ ] EC2 can resolve and reach the RDS endpoint on TCP 5432.
- [ ] PostgreSQL client can connect from EC2 using the RDS endpoint.
- [ ] Application schema has been created in `flask_crud_db`.
- [ ] Flask API can retrieve records from RDS.
- [ ] Browser can reach the application through Nginx on TCP 80.
- [ ] Add, read, update and delete operations have been manually tested.

## 9. Implementation status and deviations

**Implemented and manually validated:**
- Custom VPC and the planned public/private subnet layout.
- Public application subnet routing through an Internet Gateway.
- Private database subnet routing without a NAT Gateway default route.
- EC2 Ubuntu application server with Session Manager administration.
- Nginx public HTTP entry point and Gunicorn loopback listener.
- RDS PostgreSQL with public accessibility disabled.
- `sg-db` inbound PostgreSQL rule referencing `sg-app`.
- EC2-to-RDS connectivity and application CRUD operations.

**Operational note:** Gunicorn was initially launched manually during deployment and troubleshooting. A systemd service should be configured and tested before describing automatic process recovery or startup as implemented.

**Security and production limitations:**
- The demonstration currently uses HTTP; HTTPS/domain configuration is a future improvement.
- EC2 outbound rules were left permissive during initial setup.
- The application has no authentication and must not store real or sensitive user data.
- Monitoring, automated backups strategy review, centralized logging, CI/CD and infrastructure as code are future improvements.

Update this section whenever the deployed AWS configuration changes. The live AWS configuration is authoritative if it differs from this plan.

## 10. Cost and cleanup notes

Stopping EC2 and RDS is appropriate for a temporary pause, but it does not eliminate every AWS charge. EBS storage, RDS storage, retained backups/snapshots, public IPv4 allocations and other provisioned resources may continue to incur costs.

For a temporary pause:
- Stop the EC2 instance; do not terminate it if its EBS volume is needed.
- Stop the RDS DB instance; do not delete it if the database is needed.
- Review Elastic IP/public IPv4 and any unused NAT Gateway resources.
- Remember that RDS may automatically restart after its supported stopped period.

Before permanent deletion, take any required database backup and verify which resources and snapshots should be retained.
