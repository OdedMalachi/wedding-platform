# Wedding Platform 💍

A full-stack wedding invitation and guest management platform designed to simplify the invitation process, automate guest communication, and manage RSVP responses.

## 1. Overview

Wedding Platform provides a personalized digital invitation experience for wedding guests and a centralized management dashboard for event organizers.

### Key Features

- **Digital Invitations** — Personalized wedding invitation pages.
- **Guest Management** — Create, update, delete, search, and import guests.
- **WhatsApp Integration** — Generate personalized WhatsApp messages and support automated delivery through an approved provider.
- **RSVP Management** — Allow guests to confirm attendance and specify the number of attendees.
- **Admin Dashboard** — Monitor invitation statuses, responses, and attendance statistics.
- **Responsive Design** — Optimized for desktop and mobile devices.

## 2. System Architecture

The system follows a modular monolith architecture with a separate frontend application, backend application, and relational database.

```text
                     Wedding Platform
                            |
              +-------------+-------------+
              |                           |
         Wedding Guests              Administrator
              |                           |
              +-------------+-------------+
                            |
                      wedding-web
                   React + TypeScript
                            |
                       HTTPS / REST
                            |
                      wedding-api
                   Java + Spring Boot
                            |
          +-----------------+------------------+
          |                 |                  |
     Guest Module     Invitation Module    RSVP Module
          |                 |                  |
          +-----------------+------------------+
                            |
                       PostgreSQL

    External Integration:
    wedding-api ---> WhatsApp Business API
```

For manual WhatsApp sending, the admin frontend opens a prefilled WhatsApp message for the administrator to send.

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Java 21, Spring Boot |
| Database | PostgreSQL |
| API | REST / JSON |
| Authentication | Spring Security |
| Messaging | WhatsApp Links / WhatsApp Business API |
| Containerization | Docker, Docker Compose |
| Version Control | Git |
| Development Environment | VS Code |

## 4. Repository Structure

```text
wedding-platform/
├── wedding-web/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   └── package.json
│
├── wedding-api/
│   ├── src/main/java/com/wedding/
│   │   ├── guest/
│   │   ├── invitation/
│   │   ├── rsvp/
│   │   ├── notification/
│   │   ├── admin/
│   │   ├── security/
│   │   └── config/
│   └── pom.xml
│
├── infra/
│   └── ...
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 5. Core Modules

### Guest Management

Responsible for managing wedding guests.

- Create, update, and delete guest records.
- Import guest lists from CSV files.
- Assign maximum allowed attendees.
- Search and filter guests.

### Invitation Management

Responsible for generating and managing invitations.

- Generate cryptographically secure invitation tokens.
- Create personalized invitation URLs.
- Track invitation preparation and delivery status.
- Associate invitations with guests.

### RSVP Management

Responsible for collecting guest responses.

- Confirm or decline attendance.
- Specify the number of attendees.
- Validate attendance limits.
- Update existing RSVP responses.
- Calculate attendance statistics.

### Notification Management

Responsible for communicating with guests.

- Generate personalized WhatsApp messages.
- Support manual WhatsApp sending.
- Integrate with the official WhatsApp Business API when configured.
- Track delivery statuses when supported by the messaging provider.

## 6. Database Design

### Weddings

| Field | Type |
|---|---|
| id | UUID (PK) |
| couple_names | VARCHAR |
| wedding_date | TIMESTAMP |
| venue_name | VARCHAR |
| venue_address | VARCHAR |

### Guests

| Field | Type |
|---|---|
| id | UUID (PK) |
| wedding_id | UUID (FK) |
| name | VARCHAR |
| phone_number | VARCHAR |
| max_attendees | INTEGER |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### Invitations

| Field | Type |
|---|---|
| id | UUID (PK) |
| guest_id | UUID (FK, UNIQUE) |
| token_hash | VARCHAR (UNIQUE) |
| delivery_status | VARCHAR |
| rsvp_status | VARCHAR |
| confirmed_attendees | INTEGER |
| responded_at | TIMESTAMP |

Each wedding has multiple guests. Each guest has one invitation in the initial design.

## 7. API Design

### Public APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/invitations/{token}` | Retrieve invitation details |
| PUT | `/api/invitations/{token}/rsvp` | Submit or update RSVP |

### Admin APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/guests` | List guests |
| POST | `/api/admin/guests` | Create guest |
| PUT | `/api/admin/guests/{id}` | Update guest |
| DELETE | `/api/admin/guests/{id}` | Delete guest |
| POST | `/api/admin/guests/import` | Import guests |
| POST | `/api/admin/invitations` | Generate invitations |
| GET | `/api/admin/statistics` | Retrieve RSVP statistics |

All admin endpoints require authentication and authorization.

## 8. Invitation and RSVP Flow

1. Administrator adds or imports guests.
2. Backend generates a unique invitation token for each guest.
3. A personalized invitation URL is created.
4. Administrator sends the invitation through WhatsApp, manually or through an approved API integration.
5. Guest opens the invitation URL.
6. Frontend retrieves invitation details from the backend.
7. Guest submits an RSVP response.
8. Backend validates and persists the response.
9. Admin dashboard displays updated attendance information.

## 9. Security

- HTTPS for all production communication.
- Authentication and authorization for admin endpoints.
- Cryptographically secure, unguessable invitation tokens.
- Store invitation token hashes in the database.
- Server-side validation of RSVP data.
- Rate limiting on public invitation endpoints.
- Secure handling of guest phone numbers and personal information.
- Database credentials and API secrets stored in environment variables.
- Database backups and restricted network access.

Invitation tokens grant limited access to their corresponding invitation and should never provide administrative privileges.

## 10. Deployment

### Frontend
Deploy `wedding-web` to Vercel.

### Backend
Deploy `wedding-api` to a managed Java-compatible
