# Network Plan — Secure Two-Tier AWS Application

## 1. Project Configuration

- **AWS Region:** Asia Pacific (Mumbai) — `ap-south-1`
- **VPC CIDR:** `10.20.0.0/16`
- **Public Subnet CIDR:** `10.20.1.0/24`
- **Private Database Subnet A:** `10.20.11.0/24`
- **Private Database Subnet B:** `10.20.12.0/24`
- **Application Server:** Amazon EC2 running Ubuntu
- **Database:** Amazon RDS for PostgreSQL
- **Administration:** AWS Systems Manager Session Manager

## 2. Route Table Configuration

### 2.1 Public Route Table

**Name:** `rtb-public-app`

**Purpose:** Provides internet connectivity to resources in the public subnet through an Internet Gateway.

| Destination | Target | Purpose |
|---|---|---|
| `10.20.0.0/16` | Local | Allows routing within the VPC |
| `0.0.0.0/0` | Internet Gateway (IGW) | Routes IPv4 internet-bound traffic through the IGW |

**Subnet association:** `10.20.1.0/24` — Public Application Subnet

**Expected behavior:**
- EC2 can receive inbound web traffic when its security group permits it.
- EC2 can access the internet when it has a public IPv4 address and outbound traffic is permitted.
- The Internet Gateway provides connectivity but does not independently authorize traffic.

### 2.2 Private Database Route Table

**Name:** `rtb-private-db`

**Purpose:** Keeps database subnets without a direct internet route while allowing permitted communication within the VPC.

| Destination | Target | Purpose |
|---|---|---|
| `10.20.0.0/16` | Local | Allows routing within the VPC |

**Subnet associations:**
- Private Database Subnet A — `10.20.11.0/24`
- Private Database Subnet B — `10.20.12.0/24`

**Expected behavior:**
- Database subnets have no default route to an Internet Gateway or NAT Gateway.
- The application can communicate with the database over the VPC's local route, subject to security group rules.
- RDS is configured with public accessibility disabled.

**Design decision:** A NAT Gateway is excluded from the initial implementation to reduce cost. It is not required for the application's basic EC2-to-RDS communication.

## 3. Security Group Configuration

### 3.1 Application Security Group

**Name:** `sg-app`

**Attached resource:** EC2 application server

**Purpose:** Controls inbound web access and outbound application traffic.

#### Inbound Rules

| Type | Protocol | Port | Source | Reason |
|---|---|---|---|---|
| HTTP | TCP | 80 | `0.0.0.0/0` | Allows browser access to the application |

No inbound SSH rule is planned. Server administration will use AWS Systems Manager Session Manager, provided the required IAM permissions and network connectivity are configured.

#### Outbound Rules

| Type | Protocol | Port | Destination | Reason |
|---|---|---|---|---|
| All traffic | All | All | `0.0.0.0/0` | Initial setup, package installation and required outbound connections |

**Hardening note:** The default outbound rule is retained initially for simplicity. It can be restricted after identifying all required destinations and connectivity requirements.

### 3.2 Database Security Group

**Name:** `sg-db`

**Attached resource:** Amazon RDS for PostgreSQL

**Purpose:** Restricts database connections to the application server.

#### Inbound Rules

| Type | Protocol | Port | Source | Reason |
|---|---|---|---|---|
| PostgreSQL | TCP | 5432 | `sg-app` | Allows database access from the application server security group |

No other inbound rules are planned.

#### Outbound Rules

Retain the default outbound rule initially unless a specific requirement justifies changing it. The database security group's inbound rule remains the primary restriction on incoming database connections.

**Security decision:** The database security group references `sg-app` instead of allowing PostgreSQL connections from `0.0.0.0/0` or a broad IP range.

## 4. Traffic Flow

1. A user sends an HTTP request to the EC2 instance's public IPv4 address.
2. The public route table directs internet-bound traffic through the Internet Gateway.
3. The EC2 security group permits inbound TCP traffic on port 80.
4. The application processes the request and initiates a PostgreSQL connection to the RDS endpoint on TCP port 5432.
5. The RDS security group permits the connection because it originates from a resource associated with `sg-app`.
6. RDS returns the database response over the established connection.

## 5. Security and Validation Checklist

- [ ] VPC CIDR and subnet CIDRs do not overlap with existing networks.
- [ ] Public subnet is associated with `rtb-public-app`.
- [ ] Database subnets are associated with `rtb-private-db`.
- [ ] Public route table has a default route to the Internet Gateway.
- [ ] Private database route table has no default internet route.
- [ ] EC2 has the required public IPv4 connectivity for browser access.
- [ ] EC2 has an appropriate IAM role and working Session Manager access.
- [ ] No inbound SSH rule is configured.
- [ ] RDS has public accessibility disabled.
- [ ] `sg-db` allows TCP 5432 only from `sg-app`.
- [ ] Application-to-database connectivity is tested.
- [ ] Direct public database access is verified to be unavailable.
- [ ] Screenshots and test results are saved as implementation evidence.
- [ ] Billable resources are cleaned up after testing.

## 6. Implementation Status

**Current status:** Planned design.

Update this section after creating and validating the AWS resources. Document any deviations from this design and explain why they were necessary.
