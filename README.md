<p align="center">
    <img src="public/images/SHRMS.png" alt="Smart HRMS Logo" width="180" />
</p>

<h1 align="center">Smart Human Resource Management System</h1>

<p align="center">
    <em>An algorithm-driven HR platform for process automation and decision support.</em>
</p>

---

## Introduction

**Smart HRMS** is a Laravel 12 + React 19 (Inertia.js v2) web application designed to modernize human resource operations through automation and data-driven insight. The system consolidates day-to-day HR workflows — leave applications, performance evaluation, attendance tracking, and training planning — into a single, role-aware interface for **employees**, **evaluators**, **HR personnel**, and **PMT officers**.

At its core, Smart HRMS is powered by **four Python-based AI modules** that handle intelligent routing, predictive analytics, real-time scoring, and content-based training recommendation. The result is a streamlined HR experience that reduces manual effort, surfaces actionable metrics, and supports better workforce decisions.

---

## Core Features

### 1. Intelligent Workflow Routing System (IWR)
> *Leave Application and IPCR Routing*

Automates document flow using a **Rule-Based Workflow + Decision Tree** algorithm. Leave applications are routed to the correct approver chain, and IPCR (Individual Performance Commitment and Review) forms are sent to the appropriate evaluator based on department, role, and approval rules — eliminating misrouted requests and manual handoffs.

### 2. Predictive Performance Evaluation (PPE)
> *Forecasting employee performance trends*

Uses a **Linear Regression model** trained on three years of quarterly performance data and rating history to predict an employee's performance trajectory. Helps evaluators and HR identify high-potential staff and surface early-warning signals for declining performance.

### 3. Real-Time HR Analytics Dashboard
> *Live operational metrics powered by FlatFAT*

Displays aggregated HR metrics in real time using the **FlatFAT algorithm**, including live employee attendance streamed from the biometric terminal via the **ZKBio Zlink cloud webhook** (`acc_transaction:push`). HR personnel get an at-a-glance view of workforce status without waiting for end-of-day reports.

### 4. Automated Training Recommendation Engine (ATRE)
> *Closing competency gaps*

Applies **Content-Based Filtering** to map competency gaps from IPCR evaluation results against the seminar/training catalog. Each employee receives tailored training recommendations targeting the specific areas where they scored lowest.

---

## Installation Guide

Follow these steps to clone and run Smart HRMS on your local machine.

### Prerequisites

- **PHP 8.2+** with required extensions
- **Composer 2.x**
- **Node.js 20+** and **npm**
- **Python 3.11+** (for the four AI modules)
- **MySQL 8** or **MariaDB 10.6+**
- **Laravel Herd** (recommended) — serves the app at `https://smart-hrms.test`

### Step-by-Step Procedure

1. **Clone the repository**
    ```bash
    git clone https://github.com/your-org/Smart-HRMS.git
    cd Smart-HRMS
    ```

2. **Install PHP dependencies**
    ```bash
    composer install
    ```

3. **Install JavaScript dependencies**
    ```bash
    npm install
    ```

4. **Set up your environment file**
    ```bash
    cp .env.example .env
    php artisan key:generate
    ```
    Then edit `.env` to configure your database connection (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).

5. **Run database migrations and seeders**
    ```bash
    php artisan migrate --seed
    ```

6. **Set up the Python AI modules** (each has its own virtual environment)
    ```bash
    cd python/iwr            && python -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ../..
    cd python/ppe            && python -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ../..
    cd python/atre           && python -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ../..
    cd python/rt-hr-dashboard && python -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ../..
    ```

7. **Build frontend assets**
    ```bash
    npm run build
    ```

8. **Start the development environment**
    ```bash
    composer run dev
    ```
    This boots the Laravel server, queue worker, log tail, and Vite dev server concurrently.

9. **Access the application**
    - With Laravel Herd: visit **https://smart-hrms.test**
    - Without Herd: visit **http://localhost:8000**

> 💡 **One-shot setup:** after cloning, you can also run `composer run setup` to install dependencies, migrate, and build in a single command.

---

## Default User Credentials

All seeded accounts share the password **`password`**.

### Employees
| Name                  | Email                              | Employee ID |
| --------------------- | ---------------------------------- | ----------- |
| Maria Santos          | maria.santos@shrms.test            | EMP-002     |
| Mark Bautista         | mark.bautista@shrms.test           | EMP-003     |
| Angela Cruz           | angela.cruz@shrms.test             | EMP-004     |
| Patricia Garcia       | patricia.garcia@shrms.test         | EMP-005     |
| Kevin Mendoza         | kevin.mendoza@shrms.test           | EMP-006     |
| Lorraine Flores       | lorraine.flores@shrms.test         | EMP-007     |
| Daniel Ramos          | daniel.ramos@shrms.test            | EMP-008     |
| Camille Navarro       | camille.navarro@shrms.test         | EMP-009     |
| Joshua Aquino         | joshua.aquino@shrms.test           | EMP-010     |
| Ana Dela Cruz         | ana.delacruz@shrms.test            | EMP-011     |
| Ramon Villanueva      | ramon.villanueva@shrms.test        | EMP-012     |
| Josephine Pascual     | josephine.pascual@shrms.test       | EMP-013     |
| Michael Torres        | michael.torres@shrms.test          | EMP-014     |
| Liza Castillo         | liza.castillo@shrms.test           | EMP-015     |
| Roberto Jimenez       | roberto.jimenez@shrms.test         | EMP-016     |
| Christine Morales     | christine.morales@shrms.test       | EMP-017     |
| Ferdinand Aguilar     | ferdinand.aguilar@shrms.test       | EMP-018     |
| Maricel Dela Rosa     | maricel.delarosa@shrms.test        | EMP-019     |
| Benedict Mercado      | benedict.mercado@shrms.test        | EMP-020     |
| Theresa Evangelista   | theresa.evangelista@shrms.test     | EMP-021     |

### Evaluator
| Name        | Email                  | Employee ID |
| ----------- | ---------------------- | ----------- |
| John Reyes  | john.reyes@shrms.test  | EMP-001     |

### HR Personnel
| Name       | Email                 | Employee ID |
| ---------- | --------------------- | ----------- |
| Grace Tan  | grace.tan@shrms.test  | HR-001      |

### PMT Officer
| Name        | Email                  | Employee ID |
| ----------- | ---------------------- | ----------- |
| Mark Reyes  | mark.reyes@shrms.test  | PMT-001     |

---

## System Limitations

While Smart HRMS covers a broad range of HR workflows, it is intentionally **scoped** and does not address every HR function. Known limitations include:

- **No offline accessibility** — the system requires an active internet/LAN connection and a running Laravel + Python stack. There is no offline or sync-on-reconnect mode.
- **No payroll management** — salary computation, pay slip generation, tax withholding, and benefits disbursement are out of scope.
- **No recruitment management** — applicant tracking, job posting, interview scheduling, and onboarding pipelines are not included.
- **Limited mobile experience** — the interface is responsive but not packaged as a native mobile application.
- **Biometric dependency** — real-time attendance metrics depend on a ZKTeco terminal bound to a ZKBio Zlink tenant; events reach the system through the Zlink cloud webhook.
- **English-only UI** — no multi-language localization at this time.

---

## License

This project is intended for academic and institutional use. Refer to the repository owner for licensing terms.
