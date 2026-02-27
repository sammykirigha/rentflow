# CLAUDE.md — RentFlow Rental Property Management System

## Project Overview

RentFlow is a **single-client** rental property management system built for a single landlord operating in the **Kenyan market**. The system automates invoicing, tracks rent payments via M-Pesa, manages property expenses and maintenance, and communicates with tenants through SMS and email.

**This is NOT a multi-tenant SaaS platform.** It serves one landlord managing their full property portfolio with role-based access for property managers and tenants.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router), React 18+, TypeScript | Server components by default, client components only when needed |
| **Backend API** | Node.js 20+, Express.js or Next.js API Routes | REST API with OpenAPI/Swagger docs |
| **Database** | PostgreSQL 16+ | Primary data store, use TypeORM |
| **Cache** | Redis | Session management, wallet balance caching, rate limiting |
| **Job Scheduler** | BullMQ (Redis-backed) | Invoice generation, reminders, penalty calculation |
| **SMS** | Africa's Talking API | SMS delivery across Kenyan mobile networks |
| **Email** | Nodemailer + Resend (or SendGrid) | Transactional emails with branded templates |
| **Payments** | Safaricom Daraja API (M-Pesa) | C2B, STK Push, transaction status |
| **Auth** | NextAuth.js v5 (Auth.js) | JWT sessions, role-based access |
| **Hosting** | Vercel (frontend) + Railway/Render (API + workers) | Or self-hosted on VPS with PM2 |
| **File Storage** | AWS S3 / Cloudflare R2 | Receipts, invoices PDFs, maintenance photos |
| **Monitoring** | Sentry + Pino logger | Error tracking and structured logging |

---

## Project Structure

```
rentflow/
├── apps/
│   ├── web/                    # Next.js frontend (landlord + tenant portal)
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, forgot password
│   │   │   ├── (dashboard)/    # Landlord dashboard (protected)
│   │   │   │   ├── page.tsx              # Dashboard overview
│   │   │   │   ├── properties/           # Property management
│   │   │   │   ├── invoices/             # Invoice management
│   │   │   │   ├── tenants/              # Tenant management
│   │   │   │   ├── expenses/             # Expense & maintenance tracking
│   │   │   │   ├── communications/       # SMS/Email center
│   │   │   │   └── settings/             # Account, Paybill config, penalties
│   │   │   ├── tenant/         # Tenant self-service portal
│   │   │   │   ├── invoices/
│   │   │   │   ├── payments/
│   │   │   │   ├── maintenance/
│   │   │   │   └── receipts/
│   │   │   └── api/            # Next.js API routes (or separate Express)
│   │   │       ├── auth/
│   │   │       ├── properties/
│   │   │       ├── tenants/
│   │   │       ├── invoices/
│   │   │       ├── payments/
│   │   │       ├── expenses/
│   │   │       ├── communications/
│   │   │       └── webhooks/
│   │   │           └── mpesa/  # Daraja callbacks
│   │   ├── components/
│   │   │   ├── ui/             # Reusable UI primitives (Ant Design)
│   │   │   ├── dashboard/      # Dashboard-specific components
│   │   │   ├── invoices/       # Invoice table, detail modal, PDF preview
│   │   │   ├── properties/     # Property cards, unit grid
│   │   │   ├── tenants/        # Tenant list, profile cards
│   │   │   ├── expenses/       # Expense form, category filter, vendor cards
│   │   │   └── comms/          # Message composer, reminder queue
│   │   ├── lib/
│   │   │   ├── data-source.ts   # TypeORM DataSource config
│   │   │   ├── mpesa.ts        # Daraja API wrapper
│   │   │   ├── sms.ts          # Africa's Talking wrapper
│   │   │   ├── email.ts        # Email service wrapper
│   │   │   ├── invoice-engine.ts    # Core invoicing logic
│   │   │   ├── penalty-engine.ts    # Penalty calculation
│   │   │   ├── wallet.ts            # Wallet operations
│   │   │   ├── pdf.ts               # Invoice/receipt PDF generation
│   │   │   ├── auth.ts              # Auth config
│   │   │   ├── validators.ts        # Zod schemas
│   │   │   └── utils.ts
│   │   └── hooks/
│   │       ├── use-invoices.ts
│   │       ├── use-properties.ts
│   │       └── use-wallet.ts
│   │
├── packages/
│   ├── db/                     # TypeORM entities + migrations
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   ├── property.entity.ts
│   │   │   ├── unit.entity.ts
│   │   │   ├── tenant.entity.ts
│   │   │   ├── invoice.entity.ts
│   │   │   ├── payment.entity.ts
│   │   │   ├── wallet-transaction.entity.ts
│   │   │   ├── receipt.entity.ts
│   │   │   ├── expense.entity.ts
│   │   │   ├── vendor.entity.ts
│   │   │   ├── maintenance-request.entity.ts
│   │   │   ├── notification.entity.ts
│   │   │   ├── audit-log.entity.ts
│   │   │   └── system-config.entity.ts
│   │   ├── migrations/
│   │   ├── data-source.ts      # TypeORM DataSource configuration
│   │   ├── seed.ts
│   │   └── index.ts            # Exported DataSource + entities
│   │
│   ├── shared/                 # Shared types, constants, utils
│   │   ├── types/
│   │   │   ├── invoice.ts
│   │   │   ├── property.ts
│   │   │   ├── tenant.ts
│   │   │   ├── expense.ts
│   │   │   └── payment.ts
│   │   ├── constants/
│   │   │   ├── penalty.ts      # PENALTY_RATE = 0.05
│   │   │   └── invoice-status.ts
│   │   └── utils/
│   │       ├── format-kes.ts
│   │       └── invoice-number.ts
│   │
│   └── workers/                # BullMQ background jobs
│       ├── invoice-generator.ts     # Runs 1st of month
│       ├── penalty-calculator.ts    # Runs daily after due date
│       ├── reminder-sender.ts       # Scheduled reminders
│       └── mpesa-reconciler.ts      # Daily M-Pesa reconciliation
│
├── docker-compose.yml          # PostgreSQL + Redis for local dev
├── .env.example
├── turbo.json                  # Turborepo config
├── package.json
└── CLAUDE.md                   # This file
```

---

## Database Schema (TypeORM)

All entities live in `packages/db/entities/`. Use decorators, and always define relations explicitly. Below are the core entities.

### DataSource Configuration

```typescript
// packages/db/data-source.ts
import { DataSource } from 'typeorm';
import * as entities from './entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: Object.values(entities),
  migrations: ['packages/db/migrations/*.ts'],
  synchronize: false,  // NEVER true in production
  logging: process.env.NODE_ENV === 'development',
});
```

### Entities

```typescript
// ─── Auth & Users ───────────────────────────────────────

// packages/db/entities/user.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToOne, OneToMany, Index,
} from 'typeorm';

export enum UserRole {
  LANDLORD = 'landlord',
  MANAGER = 'manager',
  TENANT = 'tenant',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone: string; // Kenyan format: 0712345678 or +254712345678

  @Column()
  name: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  @Index()
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => Tenant, (tenant) => tenant.user)
  tenant?: Tenant;

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs: AuditLog[];
}


// ─── Properties ─────────────────────────────────────────

// packages/db/entities/property.entity.ts
@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., "Sunrise Apartments"

  @Column()
  location: string; // e.g., "Westlands, Nairobi"

  @Column({ nullable: true })
  address?: string;

  @Column('int')
  totalUnits: number;

  @Column()
  paybillNumber: string; // M-Pesa Paybill for this property

  @Column({ nullable: true })
  logoUrl?: string;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Unit, (unit) => unit.property)
  units: Unit[];

  @OneToMany(() => Expense, (expense) => expense.property)
  expenses: Expense[];
}


// packages/db/entities/unit.entity.ts
@Entity('units')
@Unique(['propertyId', 'unitNumber'])
@Index(['propertyId'])
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  unitNumber: string; // e.g., "A-101"

  @Column('uuid')
  propertyId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  rentAmount: number; // Monthly rent in KES

  @Column({ default: false })
  isOccupied: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Property, (property) => property.units)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @OneToOne(() => Tenant, (tenant) => tenant.unit)
  tenant?: Tenant;
}


// ─── Tenants ────────────────────────────────────────────

// packages/db/entities/tenant.entity.ts
export enum TenantStatus {
  ACTIVE = 'active',
  NOTICE_PERIOD = 'notice_period',
  VACATED = 'vacated',
}

@Entity('tenants')
@Index(['status'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @Column('uuid', { unique: true })
  unitId: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  walletBalance: number; // M-Pesa prepaid balance

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.ACTIVE })
  status: TenantStatus;

  @Column('timestamp')
  leaseStart: Date;

  @Column('timestamp', { nullable: true })
  leaseEnd?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => User, (user) => user.tenant)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToOne(() => Unit, (unit) => unit.tenant)
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @OneToMany(() => Invoice, (invoice) => invoice.tenant)
  invoices: Invoice[];

  @OneToMany(() => Payment, (payment) => payment.tenant)
  payments: Payment[];

  @OneToMany(() => WalletTransaction, (txn) => txn.tenant)
  walletTxns: WalletTransaction[];

  @OneToMany(() => Notification, (notif) => notif.tenant)
  notifications: Notification[];

  @OneToMany(() => MaintenanceRequest, (req) => req.tenant)
  maintenanceRequests: MaintenanceRequest[];
}


// ─── Invoices ───────────────────────────────────────────

// packages/db/entities/invoice.entity.ts
export enum InvoiceStatus {
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  UNPAID = 'unpaid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity('invoices')
@Index(['tenantId'])
@Index(['status'])
@Index(['billingMonth'])
@Index(['dueDate'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  invoiceNumber: string; // e.g., INV-T001-2026-02

  @Column('uuid')
  tenantId: string;

  @Column('timestamp')
  billingMonth: Date; // First day of billing month

  @Column('decimal', { precision: 10, scale: 2 })
  rentAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  waterCharge: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  electricityCharge: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  otherCharges: number;

  @Column({ nullable: true })
  otherChargesDesc?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  penaltyAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number; // subtotal + penalty

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amountPaid: number;

  @Column('decimal', { precision: 10, scale: 2 })
  balanceDue: number; // totalAmount - amountPaid

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.UNPAID })
  status: InvoiceStatus;

  @Column('timestamp')
  dueDate: Date;

  @Column('timestamp', { nullable: true })
  paidAt?: Date;

  @Column('timestamp', { nullable: true })
  penaltyAppliedAt?: Date;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.invoices)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments: Payment[];

  @OneToOne(() => Receipt, (receipt) => receipt.invoice)
  receipt?: Receipt;

  @OneToMany(() => Notification, (notif) => notif.invoice)
  notifications: Notification[];
}


// ─── Payments ───────────────────────────────────────────

// packages/db/entities/payment.entity.ts
export enum PaymentMethod {
  MPESA_PAYBILL = 'mpesa_paybill',
  MPESA_STK_PUSH = 'mpesa_stk_push',
  WALLET_DEDUCTION = 'wallet_deduction',
  MANUAL = 'manual',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

@Entity('payments')
@Index(['tenantId'])
@Index(['invoiceId'])
@Index(['mpesaReceiptNumber'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid', { nullable: true })
  invoiceId?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ nullable: true, unique: true })
  mpesaReceiptNumber?: string; // M-Pesa transaction ID

  @Column({ nullable: true })
  mpesaPhoneNumber?: string;

  @Column('timestamp', { default: () => 'NOW()' })
  transactionDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.payments)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, { nullable: true })
  @JoinColumn({ name: 'invoiceId' })
  invoice?: Invoice;
}


// ─── Wallet ─────────────────────────────────────────────

// packages/db/entities/wallet-transaction.entity.ts
export enum WalletTxnType {
  CREDIT = 'credit',             // M-Pesa top-up
  DEBIT_INVOICE = 'debit_invoice', // Auto-deduction for invoice
  DEBIT_PENALTY = 'debit_penalty', // Penalty deduction
  REFUND = 'refund',              // Landlord-initiated refund
}

@Entity('wallet_transactions')
@Index(['tenantId'])
@Index(['createdAt'])
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'enum', enum: WalletTxnType })
  type: WalletTxnType;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  balanceBefore: number;

  @Column('decimal', { precision: 10, scale: 2 })
  balanceAfter: number;

  @Column({ nullable: true })
  reference?: string; // Invoice number or M-Pesa receipt

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.walletTxns)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}


// ─── Receipts ───────────────────────────────────────────

// packages/db/entities/receipt.entity.ts
@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  receiptNumber: string; // e.g., RCP-T001-2026-02

  @Column('uuid', { unique: true })
  invoiceId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPaid: number;

  @Column({ nullable: true })
  pdfUrl?: string; // S3/R2 URL

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @OneToOne(() => Invoice, (invoice) => invoice.receipt)
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;
}


// ─── Expenses & Maintenance ─────────────────────────────

// packages/db/entities/expense.entity.ts
export enum ExpenseCategory {
  PLUMBING = 'plumbing',
  ROOFING = 'roofing',
  ELECTRICAL = 'electrical',
  PAINTING = 'painting',
  SECURITY = 'security',
  GENERAL_MAINTENANCE = 'general_maintenance',
  STRUCTURAL = 'structural',
  OTHER = 'other',
}

export enum ExpenseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ExpensePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('expenses')
@Index(['propertyId'])
@Index(['category'])
@Index(['status'])
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  propertyId: string;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category: ExpenseCategory;

  @Column({ type: 'enum', enum: ExpensePriority, default: ExpensePriority.MEDIUM })
  priority: ExpensePriority;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('uuid', { nullable: true })
  vendorId?: string;

  @Column({ type: 'enum', enum: ExpenseStatus, default: ExpenseStatus.PENDING })
  status: ExpenseStatus;

  @Column('timestamp', { nullable: true })
  scheduledDate?: Date;

  @Column('timestamp', { nullable: true })
  completedDate?: Date;

  @Column({ nullable: true })
  notes?: string;

  @Column('simple-array', { nullable: true })
  photos?: string[]; // Array of S3/R2 URLs

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Property, (property) => property.expenses)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @ManyToOne(() => Vendor, (vendor) => vendor.expenses, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor?: Vendor;
}


// packages/db/entities/vendor.entity.ts
@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column()
  specialty: string; // e.g., "Plumbing", "Electrical"

  @Column('decimal', { precision: 2, scale: 1, nullable: true })
  rating?: number; // 1.0 - 5.0

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Expense, (expense) => expense.vendor)
  expenses: Expense[];
}


// packages/db/entities/maintenance-request.entity.ts
@Entity('maintenance_requests')
@Index(['tenantId'])
@Index(['status'])
export class MaintenanceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  description: string;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category: ExpenseCategory;

  @Column({ type: 'enum', enum: ExpensePriority, default: ExpensePriority.MEDIUM })
  priority: ExpensePriority;

  @Column('simple-array', { nullable: true })
  photos?: string[];

  @Column({ type: 'enum', enum: ExpenseStatus, default: ExpenseStatus.PENDING })
  status: ExpenseStatus;

  @Column('timestamp', { nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.maintenanceRequests)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}


// ─── Communications ─────────────────────────────────────

// packages/db/entities/notification.entity.ts
export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  BOTH = 'both',
}

export enum NotificationType {
  INVOICE_SENT = 'invoice_sent',
  RECEIPT_SENT = 'receipt_sent',
  PAYMENT_REMINDER = 'payment_reminder',
  PENALTY_NOTICE = 'penalty_notice',
  MAINTENANCE_UPDATE = 'maintenance_update',
  LEASE_RENEWAL = 'lease_renewal',
  GENERAL = 'general',
}

@Entity('notifications')
@Index(['tenantId'])
@Index(['type'])
@Index(['sentAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid', { nullable: true })
  invoiceId?: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ nullable: true })
  subject?: string;

  @Column('text')
  message: string;

  @Column('timestamp', { nullable: true })
  sentAt?: Date;

  @Column('timestamp', { nullable: true })
  deliveredAt?: Date;

  @Column({ nullable: true })
  failReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.notifications)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => Invoice, (invoice) => invoice.notifications, { nullable: true })
  @JoinColumn({ name: 'invoiceId' })
  invoice?: Invoice;
}


// ─── Audit Log ──────────────────────────────────────────

// packages/db/entities/audit-log.entity.ts
@Entity('audit_logs')
@Index(['userId'])
@Index(['entityType', 'entityId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  action: string; // e.g., "invoice.created", "payment.received"

  @Column()
  entityType: string; // e.g., "Invoice", "Payment"

  @Column()
  entityId: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>; // Additional context

  @Column({ nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.auditLogs)
  @JoinColumn({ name: 'userId' })
  user: User;
}


// ─── System Config ──────────────────────────────────────

// packages/db/entities/system-config.entity.ts
@Entity('system_config')
export class SystemConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string; // e.g., "penalty_rate", "due_day", "reminder_days"

  @Column()
  value: string; // Stored as string, parsed by app

  @Column({ nullable: true })
  description?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## Core Business Logic

### Invoice Auto-Settlement Engine

This is the **most critical** piece of logic. It runs on the **1st of every month** via BullMQ scheduled job.

```
File: packages/workers/invoice-generator.ts
```

**Algorithm:**

```
FOR EACH active tenant:
  1. Create invoice with: rent + water + electricity + other charges
  2. Check tenant wallet balance:

     IF walletBalance >= invoiceTotal:
        → Deduct full amount from wallet
        → Record WalletTransaction (DEBIT_INVOICE)
        → Mark invoice as PAID
        → Generate Receipt
        → Send Receipt via SMS + Email
        → Log: "Auto-settled invoice {invoiceNo} for {tenantName}"

     ELSE IF walletBalance > 0 AND walletBalance < invoiceTotal:
        → Deduct wallet balance from invoice
        → Record WalletTransaction (DEBIT_INVOICE)
        → Set remaining = invoiceTotal - walletBalance
        → Update wallet to 0
        → Mark invoice as PARTIALLY_PAID
        → Send Updated Invoice with remaining balance
        → Log: "Partial settlement for {invoiceNo}, remaining: {remaining}"

     ELSE (walletBalance = 0):
        → Mark invoice as UNPAID
        → Send Full Invoice via SMS + Email
        → Log: "Invoice {invoiceNo} sent unpaid to {tenantName}"
```

### Penalty Engine

Runs **daily** after the due date (default: 5th of month).

```
Penalty Rate: 5% of outstanding balance (configurable via SystemConfig)

IF currentDate > invoice.dueDate AND invoice.balanceDue > 0:
   penalty = balanceDue × PENALTY_RATE
   invoice.penaltyAmount += penalty
   invoice.totalAmount += penalty
   invoice.balanceDue += penalty
   invoice.status = OVERDUE
   Send penalty notification to tenant
```

### Reminder Schedule

| Day of Month | Action |
|---|---|
| 1st | Invoice generated + auto-settlement attempt |
| 3rd | First reminder to unpaid/partial tenants |
| 5th | Due date — final reminder with penalty warning |
| 6th+ | Penalty applied, updated invoice sent |
| 10th | Escalation notification to landlord |

---

## M-Pesa Integration (Daraja API)

### Environment Variables

```env
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=123456          # Paybill number
MPESA_CALLBACK_URL=https://yourdomain.com/api/webhooks/mpesa/callback
MPESA_VALIDATION_URL=https://yourdomain.com/api/webhooks/mpesa/validate
MPESA_CONFIRMATION_URL=https://yourdomain.com/api/webhooks/mpesa/confirm
MPESA_ENVIRONMENT=sandbox       # sandbox | production
```

### Key Flows

1. **C2B (Customer to Business):** Tenant pays via M-Pesa Paybill. Daraja sends validation → confirmation callback. System credits wallet or settles invoice directly.

2. **STK Push:** System initiates payment prompt on tenant's phone. Used for "Pay Now" button in tenant portal.

3. **Account Reference:** Always use the tenant's **unit number** (e.g., "A-101") as the M-Pesa account reference for automatic reconciliation.

4. **Wallet Top-Up:** Any payment that doesn't match an open invoice gets credited to the tenant's wallet balance for future auto-settlement.

### Webhook Security

- Validate callback IP against Safaricom's known IP ranges
- Verify transaction via Transaction Status API for amounts > KES 10,000
- Idempotency: check `mpesaReceiptNumber` uniqueness before processing
- Log ALL callbacks (success and failure) to AuditLog

---

## API Conventions

### RESTful Endpoints

```
GET    /api/properties              # List all properties
POST   /api/properties              # Create property
GET    /api/properties/:id          # Get property details
PATCH  /api/properties/:id          # Update property
GET    /api/properties/:id/units    # List units for property

GET    /api/tenants                 # List all tenants
POST   /api/tenants                 # Create tenant (assign to unit)
GET    /api/tenants/:id             # Get tenant profile + wallet
PATCH  /api/tenants/:id             # Update tenant

GET    /api/invoices                # List invoices (filter by status, month, tenant)
POST   /api/invoices/generate       # Trigger manual invoice generation
GET    /api/invoices/:id            # Get invoice detail
POST   /api/invoices/:id/penalty    # Apply penalty manually
GET    /api/invoices/:id/pdf        # Download invoice PDF
GET    /api/invoices/:id/receipt    # Download receipt PDF

POST   /api/payments/stk-push       # Initiate STK Push
GET    /api/payments                 # Payment history
POST   /api/webhooks/mpesa/validate  # Daraja validation callback
POST   /api/webhooks/mpesa/confirm   # Daraja confirmation callback

GET    /api/expenses                # List expenses (filter by property, category, status)
POST   /api/expenses                # Log new expense
PATCH  /api/expenses/:id            # Update expense status

GET    /api/communications           # Sent messages log
POST   /api/communications/reminder  # Send reminder to specific tenant
POST   /api/communications/bulk      # Send bulk reminders to all unpaid

GET    /api/dashboard/stats          # Dashboard KPIs
GET    /api/dashboard/revenue        # Revenue trends
```

### Response Format

```typescript
// Success
{
  success: true,
  data: { ... },
  meta?: { page, limit, total }
}

// Error
{
  success: false,
  error: {
    code: "INVOICE_NOT_FOUND",
    message: "Invoice with ID xyz not found"
  }
}
```

### Validation

Use **Zod** for all request validation. Define schemas in `lib/validators.ts` and reuse between frontend and API.

```typescript
import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^(?:\+254|0)\d{9}$/, 'Invalid Kenyan phone number'),
  unitId: z.string().cuid(),
  rentAmount: z.number().positive(),
  leaseStart: z.string().datetime(),
});
```

---

## Coding Standards

### General

- **TypeScript** everywhere — no `any` types. Use strict mode.
- **TypeORM** for all database access — use the repository pattern. Raw SQL only via `queryRunner` when absolutely necessary.
- **Zod** for validation — shared between frontend forms and API endpoints.
- **Decimal.js** or TypeORM `decimal` columns for ALL monetary values. Never use JavaScript floats for money.
- **Consistent error handling** — wrap all async route handlers with try/catch or use a middleware wrapper.
- **Audit everything** — every mutation (create, update, delete) writes to AuditLog with userId, action, and metadata.

### Naming Conventions

- Files: `kebab-case.ts` (e.g., `invoice-engine.ts`)
- Components: `PascalCase.tsx` (e.g., `InvoiceTable.tsx`)
- Database fields: `camelCase` in entities, `snake_case` in DB (use TypeORM `@Column({ name: 'snake_case' })` or a global naming strategy)
- API routes: `kebab-case` (e.g., `/api/stk-push`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `PENALTY_RATE`)
- Types/Interfaces: `PascalCase` prefixed with purpose (e.g., `CreateTenantInput`)

### Frontend

- Use **Ant Design (antd)** for component primitives — leverage its built-in Table, Form, Modal, DatePicker, and notification components. Use the ConfigProvider for global theming.
- Use **TanStack Query (React Query)** for server state management.
- Use **Ant Design Form** with Zod validation (via `@ant-design/pro-form` or custom validator adapters) for forms.
- Server components by default; add `'use client'` only for interactive components.
- Format all currency with `formatKES()` utility: `KES 35,000`.
- All tables must support: sorting, filtering, pagination, and CSV export.
- Dashboard must be responsive down to tablet (768px minimum).

### Backend

- All financial operations must be wrapped in **TypeORM transactions** (`dataSource.transaction()` or `queryRunner`).
- Wallet operations must use **pessimistic locking** — use TypeORM's `queryRunner.manager.findOne()` with `{ lock: { mode: 'pessimistic_write' } }` to prevent race conditions.
- M-Pesa callbacks must be **idempotent** — duplicate callbacks should not double-credit.
- Background jobs must be **retryable** — use BullMQ's built-in retry with exponential backoff.
- All dates stored as **UTC** in the database. Convert to **Africa/Nairobi** timezone (EAT, UTC+3) only in the presentation layer.

### Security

- Rate limit all API endpoints (use `express-rate-limit` or Next.js middleware).
- Rate limit M-Pesa STK Push to prevent abuse (max 3 attempts per tenant per hour).
- Sanitize all user inputs — especially in SMS message templates.
- Never log sensitive data (passwords, M-Pesa secrets, full phone numbers in production logs).
- RBAC middleware must check role on every protected route:
  - `LANDLORD`: Full access to everything.
  - `MANAGER`: CRUD on tenants, invoices, expenses. Cannot modify properties or system config.
  - `TENANT`: Read-only on own invoices, payments, receipts. Can create maintenance requests.

---

## Environment Variables

```env
# ─── Database
DATABASE_URL=postgresql://user:pass@localhost:5432/rentflow
REDIS_URL=redis://localhost:6379

# ─── Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# ─── M-Pesa (Daraja)
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=
MPESA_CALLBACK_URL=
MPESA_ENVIRONMENT=sandbox

# ─── SMS (Africa's Talking)
AT_API_KEY=
AT_USERNAME=
AT_SENDER_ID=RENTFLOW

# ─── Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=invoices@rentflow.co.ke

# ─── Storage
S3_BUCKET=rentflow-files
S3_REGION=af-south-1
S3_ACCESS_KEY=
S3_SECRET_KEY=

# ─── App Config
PENALTY_RATE=0.05
INVOICE_DUE_DAY=5
REMINDER_DAYS=3,5
TIMEZONE=Africa/Nairobi
```

---

## Local Development Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd rentflow
npm install

# 2. Start infrastructure
docker-compose up -d    # PostgreSQL + Redis

# 3. Setup database
npm run typeorm migration:run
npm run seed

# 4. Configure environment
cp .env.example .env    # Fill in your values

# 5. Run development server
npm run dev              # Starts Next.js on :3000

# 6. Run workers (separate terminal)
npm run workers          # Starts BullMQ job processors
```

---

## Testing

- **Unit tests** for invoice engine, penalty engine, wallet logic — use Vitest.
- **Integration tests** for API endpoints — use Supertest with a test database.
- **M-Pesa mocks** — mock Daraja API responses for testing payment flows without hitting sandbox.
- **Seed data** — `packages/db/seed.ts` must create realistic test data: 3 properties, 20+ tenants, invoices across multiple months.

```bash
npm run test             # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # API tests only
npm run test:coverage    # With coverage report
```

---

## Key Decisions & Constraints

1. **Single-client system** — no multi-tenancy abstractions needed. One landlord, one database.
2. **M-Pesa first** — this is Kenya. M-Pesa is the primary payment method. Card payments are out of scope for v1.
3. **Wallet model** — tenants pre-pay into a wallet via M-Pesa. On the 1st, the system auto-deducts. This reduces failed payments and simplifies reconciliation.
4. **SMS is critical** — many tenants may not check email. SMS is the primary notification channel, email is secondary.
5. **Kenyan phone format** — accept both `0712345678` and `+254712345678`. Normalize to `254712345678` (no +) for Daraja API.
6. **Currency** — all amounts in KES (Kenya Shillings). No multi-currency support needed.
7. **Timezone** — all business logic uses `Africa/Nairobi` (EAT, UTC+3). Database stores UTC.
8. **PDF generation** — use `@react-pdf/renderer` or `puppeteer` for invoice and receipt PDFs with company branding.
9. **Web-only for v1** — no mobile app. Focus on a responsive Next.js web application. Mobile app and USSD are future enhancements.
10. **Browser support** — target modern browsers (Chrome, Firefox, Safari, Edge). No IE11 support.


# M-Pesa Paybill → Wallet → Invoice Settlement Flow

## The Big Picture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Tenant     │     │   Safaricom  │     │   RentFlow   │     │   Tenant     │
│   pays via   │────▶│   Daraja     │────▶│   Webhook    │────▶│   Wallet     │
│   M-Pesa     │     │   C2B API    │     │   Handler    │     │   Credited   │
└─────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
      Paybill: 123456 (Property)                                      │
      Account: A-101  (Unit)                                          ▼
                                                               ┌──────────────┐
                                                               │  1st of Month│
                                                               │  Auto-Settle │
                                                               │  Invoices    │
                                                               └──────────────┘
```

**The core idea:** Every M-Pesa payment that hits the Paybill goes into the tenant's **wallet**. The wallet is the single source of funds. Invoices are only ever settled from the wallet — never directly from M-Pesa.

---

## Step-by-Step Flow

### 1. Tenant Makes Payment

Tenant opens M-Pesa on their phone:

```
Lipa Na M-Pesa → Pay Bill
  Business Number: 123456        ← Property's Paybill
  Account Number:  A-101         ← Unit number
  Amount:          KES 38,700
```

### 2. Safaricom Sends Validation Request

Before processing, Daraja hits your **validation URL** to check if you accept this payment.

```
POST /api/webhooks/mpesa/validate

Safaricom sends:
{
  "TransactionType": "Pay Bill",
  "TransID": "RKTQDM7W6S",
  "TransTime": "20260201120000",
  "TransAmount": "38700.00",
  "BusinessShortCode": "123456",
  "BillRefNumber": "A-101",          ← This is the account number (unit)
  "InvoiceNumber": "",
  "OrgAccountBalance": "",
  "ThirdPartyTransID": "",
  "MSISDN": "254712345678",          ← Tenant's phone
  "FirstName": "JAMES",
  "MiddleName": "",
  "LastName": "MWANGI"
}
```

**Your validation logic:**

```
1. Find Property by BusinessShortCode (Paybill "123456")
   → If no property found → REJECT

2. Normalize BillRefNumber (trim, uppercase) → "A-101"

3. Find Unit by unitNumber "A-101" within that Property
   → If no unit found → REJECT

4. Find active Tenant assigned to that Unit
   → If no tenant → REJECT

5. (Optional) Verify MSISDN matches tenant's phone
   → If mismatch → still ACCEPT (tenants may pay from different numbers)

6. Return { "ResultCode": 0, "ResultDesc": "Accepted" }
```

### 3. Safaricom Sends Confirmation Callback

After validation passes and M-Pesa processes the payment:

```
POST /api/webhooks/mpesa/confirm

Same payload as validation, but now the money has moved.
This is where you credit the wallet.
```

**Your confirmation logic (THE CRITICAL PART):**

```
1. Check idempotency — has TransID "RKTQDM7W6S" been processed before?
   → If yes → return success (don't double-credit)

2. Resolve tenant:
   Property = find by BusinessShortCode "123456"
   Unit     = find by unitNumber "A-101" in that Property
   Tenant   = find active tenant on that Unit

3. Start database TRANSACTION:
   a. Lock tenant record (pessimistic write)
   b. Record the Payment:
      - tenantId, amount, method: MPESA_PAYBILL
      - mpesaReceiptNumber: "RKTQDM7W6S"
      - mpesaPhoneNumber: "254712345678"
      - status: COMPLETED
   c. Credit the Wallet:
      - balanceBefore = tenant.walletBalance (e.g., 0)
      - balanceAfter  = 0 + 38,700 = 38,700
      - type: CREDIT
      - reference: "RKTQDM7W6S"
   d. Update tenant.walletBalance = 38,700
   e. Log to AuditLog

4. COMMIT transaction

5. Send SMS confirmation to tenant:
   "Dear James, KES 38,700 received via M-Pesa (Ref: RKTQDM7W6S).
    Your wallet balance is KES 38,700. Thank you!"

6. Return { "ResultCode": 0, "ResultDesc": "Success" }
```

### 4. Invoice Day (1st of Month) — Wallet Auto-Settlement

The BullMQ scheduled job runs and finds this tenant:

```
Tenant: James Mwangi
Wallet: KES 38,700
Invoice: Rent 35,000 + Water 1,200 + Electricity 2,500 = KES 38,700

Wallet (38,700) >= Invoice (38,700) → FULL SETTLEMENT
  → Deduct 38,700 from wallet
  → Wallet balance = 0
  → Invoice status = PAID
  → Generate receipt
  → Send receipt via SMS + Email
```

---

## Implementation

### Database: Register Multiple Paybills

Each property has its own Paybill. The system needs to map incoming payments to the right property.

```typescript
// The Property entity already has paybillNumber
// But you need a fast lookup index

// packages/db/entities/property.entity.ts
@Entity('properties')
export class Property {
  // ... existing fields ...

  @Column()
  @Index()                    // ← Index for fast Paybill lookup
  paybillNumber: string;
}
```

### Daraja C2B Registration

On app startup (or via a one-time setup script), register your validation and confirmation URLs with Safaricom for each Paybill.

```typescript
// lib/mpesa.ts
import axios from 'axios';

export class MpesaService {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor() {
    this.baseUrl = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    this.consumerKey = process.env.MPESA_CONSUMER_KEY!;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
  }

  // Get OAuth token (cached, refreshed before expiry)
  async getAccessToken(): Promise<string> {
    const auth = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`
    ).toString('base64');

    const { data } = await axios.get(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    return data.access_token;
  }

  // Register C2B URLs for a specific Paybill
  async registerC2BUrls(shortCode: string): Promise<void> {
    const token = await this.getAccessToken();

    await axios.post(
      `${this.baseUrl}/mpesa/c2b/v1/registerurl`,
      {
        ShortCode: shortCode,
        ResponseType: 'Completed',    // or 'Cancelled' to auto-reject on validation failure
        ConfirmationURL: `${process.env.MPESA_CALLBACK_URL}/confirm`,
        ValidationURL: `${process.env.MPESA_CALLBACK_URL}/validate`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  // STK Push for "Pay Now" button in tenant portal
  async stkPush(params: {
    phone: string;        // 254712345678
    amount: number;
    accountRef: string;   // Unit number e.g. "A-101"
    shortCode: string;    // Property Paybill
  }): Promise<{ CheckoutRequestID: string }> {
    const token = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
    const password = Buffer.from(
      `${params.shortCode}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const { data } = await axios.post(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: params.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(params.amount),
        PartyA: params.phone,
        PartyB: params.shortCode,
        PhoneNumber: params.phone,
        CallBackURL: `${process.env.MPESA_CALLBACK_URL}/stk-callback`,
        AccountReference: params.accountRef,
        TransactionDesc: `Rent payment for ${params.accountRef}`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  }
}
```

### Webhook Handlers

```typescript
// app/api/webhooks/mpesa/validate/route.ts
import { AppDataSource } from '@/packages/db';
import { Property } from '@/packages/db/entities/property.entity';
import { Unit } from '@/packages/db/entities/unit.entity';
import { Tenant, TenantStatus } from '@/packages/db/entities/tenant.entity';

export async function POST(req: Request) {
  const body = await req.json();

  const {
    BusinessShortCode: paybill,
    BillRefNumber: accountNumber,
    TransAmount: amount,
    MSISDN: phone,
  } = body;

  // 1. Find property by Paybill
  const propertyRepo = AppDataSource.getRepository(Property);
  const property = await propertyRepo.findOne({
    where: { paybillNumber: paybill, isActive: true },
  });

  if (!property) {
    console.error(`[MPESA VALIDATE] Unknown Paybill: ${paybill}`);
    return Response.json({
      ResultCode: 1,
      ResultDesc: 'Rejected: Unknown business number',
    });
  }

  // 2. Normalize account number and find unit
  const normalizedUnit = accountNumber?.toString().trim().toUpperCase();
  const unitRepo = AppDataSource.getRepository(Unit);
  const unit = await unitRepo.findOne({
    where: { propertyId: property.id, unitNumber: normalizedUnit },
  });

  if (!unit) {
    console.error(`[MPESA VALIDATE] Unknown unit: ${normalizedUnit} in ${property.name}`);
    return Response.json({
      ResultCode: 1,
      ResultDesc: 'Rejected: Invalid account number',
    });
  }

  // 3. Find active tenant on this unit
  const tenantRepo = AppDataSource.getRepository(Tenant);
  const tenant = await tenantRepo.findOne({
    where: { unitId: unit.id, status: TenantStatus.ACTIVE },
  });

  if (!tenant) {
    console.error(`[MPESA VALIDATE] No active tenant on unit ${normalizedUnit}`);
    return Response.json({
      ResultCode: 1,
      ResultDesc: 'Rejected: No active tenant on this unit',
    });
  }

  // 4. Accept payment
  console.log(`[MPESA VALIDATE] Accepted: KES ${amount} from ${phone} for ${normalizedUnit}`);
  return Response.json({
    ResultCode: 0,
    ResultDesc: 'Accepted',
  });
}
```

```typescript
// app/api/webhooks/mpesa/confirm/route.ts
import { AppDataSource } from '@/packages/db';
import { Property } from '@/packages/db/entities/property.entity';
import { Unit } from '@/packages/db/entities/unit.entity';
import { Tenant, TenantStatus } from '@/packages/db/entities/tenant.entity';
import { Payment, PaymentMethod, PaymentStatus } from '@/packages/db/entities/payment.entity';
import { WalletTransaction, WalletTxnType } from '@/packages/db/entities/wallet-transaction.entity';
import { AuditLog } from '@/packages/db/entities/audit-log.entity';
import { sendSms } from '@/lib/sms';
import { formatKES } from '@/packages/shared/utils/format-kes';

export async function POST(req: Request) {
  const body = await req.json();

  const {
    TransID: mpesaRef,
    BusinessShortCode: paybill,
    BillRefNumber: accountNumber,
    TransAmount: amountStr,
    MSISDN: phone,
    FirstName: firstName,
  } = body;

  const amount = parseFloat(amountStr);
  const normalizedUnit = accountNumber?.toString().trim().toUpperCase();

  // ── Idempotency check ─────────────────────────────────
  const paymentRepo = AppDataSource.getRepository(Payment);
  const existing = await paymentRepo.findOne({
    where: { mpesaReceiptNumber: mpesaRef },
  });

  if (existing) {
    console.log(`[MPESA CONFIRM] Duplicate callback ignored: ${mpesaRef}`);
    return Response.json({ ResultCode: 0, ResultDesc: 'Already processed' });
  }

  // ── Resolve tenant ────────────────────────────────────
  const propertyRepo = AppDataSource.getRepository(Property);
  const property = await propertyRepo.findOne({
    where: { paybillNumber: paybill, isActive: true },
  });

  if (!property) {
    console.error(`[MPESA CONFIRM] Unknown Paybill: ${paybill} for ${mpesaRef}`);
    // Still return success to Safaricom (money is already moved)
    // Flag for manual reconciliation
    return Response.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  const unitRepo = AppDataSource.getRepository(Unit);
  const unit = await unitRepo.findOne({
    where: { propertyId: property.id, unitNumber: normalizedUnit },
  });

  const tenantRepo = AppDataSource.getRepository(Tenant);
  const tenant = unit
    ? await tenantRepo.findOne({
        where: { unitId: unit.id, status: TenantStatus.ACTIVE },
        relations: ['user'],
      })
    : null;

  // ── Credit wallet in a transaction ────────────────────
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    if (tenant) {
      // Lock the tenant row to prevent concurrent wallet updates
      const lockedTenant = await queryRunner.manager.findOne(Tenant, {
        where: { id: tenant.id },
        lock: { mode: 'pessimistic_write' },
      });

      const balanceBefore = Number(lockedTenant!.walletBalance);
      const balanceAfter = balanceBefore + amount;

      // Record payment
      const payment = queryRunner.manager.create(Payment, {
        tenantId: tenant.id,
        amount,
        method: PaymentMethod.MPESA_PAYBILL,
        status: PaymentStatus.COMPLETED,
        mpesaReceiptNumber: mpesaRef,
        mpesaPhoneNumber: phone,
        transactionDate: new Date(),
      });
      await queryRunner.manager.save(payment);

      // Record wallet transaction
      const walletTxn = queryRunner.manager.create(WalletTransaction, {
        tenantId: tenant.id,
        type: WalletTxnType.CREDIT,
        amount,
        balanceBefore,
        balanceAfter,
        reference: mpesaRef,
        description: `M-Pesa payment from ${phone}`,
      });
      await queryRunner.manager.save(walletTxn);

      // Update tenant wallet balance
      await queryRunner.manager.update(Tenant, tenant.id, {
        walletBalance: balanceAfter,
      });

      // Audit log
      const auditLog = queryRunner.manager.create(AuditLog, {
        userId: tenant.userId,
        action: 'wallet.credited',
        entityType: 'WalletTransaction',
        entityId: walletTxn.id,
        metadata: {
          mpesaRef,
          phone,
          amount,
          paybill,
          unitNumber: normalizedUnit,
          balanceBefore,
          balanceAfter,
        },
      });
      await queryRunner.manager.save(auditLog);

      await queryRunner.commitTransaction();

      // ── Send SMS confirmation (outside transaction) ───
      await sendSms(
        tenant.user.phone,
        `Dear ${firstName}, ${formatKES(amount)} received via M-Pesa ` +
        `(Ref: ${mpesaRef}). Your RentFlow wallet balance is ` +
        `${formatKES(balanceAfter)}. Thank you!`
      );

      console.log(
        `[MPESA CONFIRM] Wallet credited: ${formatKES(amount)} → ` +
        `${tenant.user.name} (${normalizedUnit}), balance: ${formatKES(balanceAfter)}`
      );
    } else {
      // ── Unmatched payment — log for manual reconciliation ──
      const payment = queryRunner.manager.create(Payment, {
        tenantId: null as any,
        amount,
        method: PaymentMethod.MPESA_PAYBILL,
        status: PaymentStatus.COMPLETED,
        mpesaReceiptNumber: mpesaRef,
        mpesaPhoneNumber: phone,
      });
      // Save to a separate unmatched_payments table or flag it
      await queryRunner.manager.save(payment);
      await queryRunner.commitTransaction();

      console.warn(
        `[MPESA CONFIRM] Unmatched payment: ${mpesaRef}, ` +
        `KES ${amount} from ${phone}, account: ${normalizedUnit}`
      );
    }
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error(`[MPESA CONFIRM] Transaction failed for ${mpesaRef}:`, error);
  } finally {
    await queryRunner.release();
  }

  // Always return success to Safaricom
  return Response.json({ ResultCode: 0, ResultDesc: 'Success' });
}
```

### STK Push (Tenant Portal "Pay Now" Button)

When a tenant clicks "Pay Now" on an unpaid invoice:

```typescript
// app/api/payments/stk-push/route.ts
import { MpesaService } from '@/lib/mpesa';
import { AppDataSource } from '@/packages/db';
import { Tenant } from '@/packages/db/entities/tenant.entity';
import { Unit } from '@/packages/db/entities/unit.entity';
import { Property } from '@/packages/db/entities/property.entity';
import { Invoice } from '@/packages/db/entities/invoice.entity';

const mpesa = new MpesaService();

export async function POST(req: Request) {
  const { invoiceId } = await req.json();
  // auth middleware would give you the current user/tenant

  const invoiceRepo = AppDataSource.getRepository(Invoice);
  const invoice = await invoiceRepo.findOne({
    where: { id: invoiceId },
    relations: ['tenant', 'tenant.unit', 'tenant.unit.property', 'tenant.user'],
  });

  if (!invoice) {
    return Response.json({ success: false, error: 'Invoice not found' }, { status: 404 });
  }

  const tenant = invoice.tenant;
  const unit = tenant.unit;
  const property = unit.property;

  // Normalize phone: 0712345678 → 254712345678
  const phone = tenant.user.phone.startsWith('0')
    ? `254${tenant.user.phone.slice(1)}`
    : tenant.user.phone.replace('+', '');

  const result = await mpesa.stkPush({
    phone,
    amount: Number(invoice.balanceDue),
    accountRef: unit.unitNumber,        // A-101
    shortCode: property.paybillNumber,  // 123456
  });

  return Response.json({
    success: true,
    data: { checkoutRequestId: result.CheckoutRequestID },
  });
}
```

The STK Push callback follows the same wallet-crediting logic as the C2B confirmation.

### Invoice Auto-Settlement Worker

```typescript
// packages/workers/invoice-generator.ts
import { AppDataSource } from '@/packages/db';
import { Tenant, TenantStatus } from '@/packages/db/entities/tenant.entity';
import { Invoice, InvoiceStatus } from '@/packages/db/entities/invoice.entity';
import { WalletTransaction, WalletTxnType } from '@/packages/db/entities/wallet-transaction.entity';
import { Receipt } from '@/packages/db/entities/receipt.entity';
import { sendSms } from '@/lib/sms';
import { sendEmail } from '@/lib/email';
import { generateInvoiceNumber, generateReceiptNumber } from '@/packages/shared/utils/invoice-number';
import { formatKES } from '@/packages/shared/utils/format-kes';

export async function generateMonthlyInvoices() {
  const tenantRepo = AppDataSource.getRepository(Tenant);
  const activeTenants = await tenantRepo.find({
    where: { status: TenantStatus.ACTIVE },
    relations: ['user', 'unit', 'unit.property'],
  });

  for (const tenant of activeTenants) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock tenant for wallet operations
      const lockedTenant = await queryRunner.manager.findOne(Tenant, {
        where: { id: tenant.id },
        lock: { mode: 'pessimistic_write' },
      });

      const unit = tenant.unit;
      const now = new Date();
      const billingMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const dueDate = new Date(now.getFullYear(), now.getMonth(), 5); // 5th

      // Create invoice
      // (water + electricity would come from meter readings or fixed charges)
      const rentAmount = Number(unit.rentAmount);
      const waterCharge = 1200;   // TODO: pull from utility readings
      const electricityCharge = 2500;
      const subtotal = rentAmount + waterCharge + electricityCharge;

      const invoice = queryRunner.manager.create(Invoice, {
        invoiceNumber: generateInvoiceNumber(tenant.id, billingMonth),
        tenantId: tenant.id,
        billingMonth,
        rentAmount,
        waterCharge,
        electricityCharge,
        subtotal,
        totalAmount: subtotal,
        balanceDue: subtotal,
        dueDate,
        status: InvoiceStatus.UNPAID,
      });

      // ── Wallet auto-settlement ──────────────────────
      const walletBalance = Number(lockedTenant!.walletBalance);

      if (walletBalance >= subtotal) {
        // FULL SETTLEMENT
        invoice.amountPaid = subtotal;
        invoice.balanceDue = 0;
        invoice.status = InvoiceStatus.PAID;
        invoice.paidAt = now;

        await queryRunner.manager.save(invoice);

        // Debit wallet
        await queryRunner.manager.save(
          queryRunner.manager.create(WalletTransaction, {
            tenantId: tenant.id,
            type: WalletTxnType.DEBIT_INVOICE,
            amount: subtotal,
            balanceBefore: walletBalance,
            balanceAfter: walletBalance - subtotal,
            reference: invoice.invoiceNumber,
            description: `Auto-settlement for ${invoice.invoiceNumber}`,
          })
        );

        await queryRunner.manager.update(Tenant, tenant.id, {
          walletBalance: walletBalance - subtotal,
        });

        // Generate receipt
        const receipt = queryRunner.manager.create(Receipt, {
          receiptNumber: generateReceiptNumber(tenant.id, billingMonth),
          invoiceId: invoice.id,
          totalPaid: subtotal,
        });
        await queryRunner.manager.save(receipt);

        await queryRunner.commitTransaction();

        // Send receipt
        await sendSms(
          tenant.user.phone,
          `Dear ${tenant.user.name}, your rent for ${unit.unitNumber} ` +
          `(${formatKES(subtotal)}) has been auto-settled from your wallet. ` +
          `Receipt: ${receipt.receiptNumber}. Wallet balance: ` +
          `${formatKES(walletBalance - subtotal)}.`
        );

      } else if (walletBalance > 0) {
        // PARTIAL SETTLEMENT
        invoice.amountPaid = walletBalance;
        invoice.balanceDue = subtotal - walletBalance;
        invoice.status = InvoiceStatus.PARTIALLY_PAID;

        await queryRunner.manager.save(invoice);

        await queryRunner.manager.save(
          queryRunner.manager.create(WalletTransaction, {
            tenantId: tenant.id,
            type: WalletTxnType.DEBIT_INVOICE,
            amount: walletBalance,
            balanceBefore: walletBalance,
            balanceAfter: 0,
            reference: invoice.invoiceNumber,
            description: `Partial settlement for ${invoice.invoiceNumber}`,
          })
        );

        await queryRunner.manager.update(Tenant, tenant.id, {
          walletBalance: 0,
        });

        await queryRunner.commitTransaction();

        await sendSms(
          tenant.user.phone,
          `Dear ${tenant.user.name}, ${formatKES(walletBalance)} deducted ` +
          `from your wallet for rent. Remaining balance: ` +
          `${formatKES(subtotal - walletBalance)}. ` +
          `Pay to Paybill ${unit.property.paybillNumber}, ` +
          `Account: ${unit.unitNumber}.`
        );

      } else {
        // UNPAID
        await queryRunner.manager.save(invoice);
        await queryRunner.commitTransaction();

        await sendSms(
          tenant.user.phone,
          `Dear ${tenant.user.name}, your invoice ${invoice.invoiceNumber} ` +
          `for ${formatKES(subtotal)} is due by ${dueDate.toLocaleDateString()}. ` +
          `Pay to Paybill ${unit.property.paybillNumber}, ` +
          `Account: ${unit.unitNumber}.`
        );
      }

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`[INVOICE GEN] Failed for tenant ${tenant.id}:`, error);
    } finally {
      await queryRunner.release();
    }
  }
}
```

---

## Key Mapping: How Paybill + Account Resolves to a Tenant

```
M-Pesa Payment
│
├── BusinessShortCode: "123456"
│   └── → properties.paybillNumber = "123456"
│         └── → Property: "Sunrise Apartments" (id: P001)
│
├── BillRefNumber: "A-101"
│   └── → units.unitNumber = "A-101" WHERE propertyId = P001
│         └── → Unit: A-101 (id: U001)
│
└── Resolved Tenant:
    └── → tenants.unitId = U001 WHERE status = ACTIVE
          └── → Tenant: James Mwangi (id: T001)
                └── → Credit walletBalance += TransAmount
```

### Account Number Normalization

Tenants may type the account number inconsistently. Always normalize:

```typescript
// lib/utils/normalize-account.ts
export function normalizeAccountNumber(raw: string): string {
  return raw
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')     // Remove spaces: "A 101" → "A101"
    .replace(/^0+/, '');      // Remove leading zeros if numeric
}

// Examples:
// "a-101"    → "A-101"
// " A-101 "  → "A-101"
// "a 101"    → "A101"  ← might not match, so enforce format in unit creation
```

**Recommendation:** Enforce a strict unit number format (e.g., `A-101`) at the property setup level, and instruct tenants to use the exact format on the invoice.

---

## Edge Cases to Handle

| Scenario | What Happens |
|---|---|
| **Wrong account number** | Validation rejects. Tenant gets M-Pesa failure message. Money stays with tenant. |
| **Correct Paybill, wrong unit** | Validation rejects. Same as above. |
| **Tenant pays from someone else's phone** | Accept it. Match by Paybill + Account, not phone number. Credit the wallet. |
| **Duplicate callback from Safaricom** | Idempotency check on `TransID`. Skip if already processed. |
| **Payment after invoice already settled** | Goes to wallet. Will apply to next month's invoice. |
| **Overpayment** | Full invoice settled, remainder stays in wallet for next month. |
| **Tenant vacated but someone pays to their unit** | Validation rejects (no active tenant on unit). |
| **Server down during callback** | Safaricom retries callbacks. Your handler is idempotent so retries are safe. |
| **Database error mid-transaction** | Transaction rolls back. No partial wallet credit. Safaricom retries callback. |
| **Payment while invoice generation is running** | Pessimistic lock on tenant prevents race condition. One operation completes first, the other waits. |

---

## Security Checklist

- [ ] Validate Safaricom callback IP addresses (whitelist their known ranges)
- [ ] HTTPS only for callback URLs (Safaricom requirement)
- [ ] Idempotency on TransID — never double-credit
- [ ] Pessimistic locking on wallet operations — prevent race conditions
- [ ] Never log full phone numbers in production (mask: 2547****5678)
- [ ] Verify large payments (> KES 70,000) via Transaction Status API before crediting
- [ ] Rate limit webhook endpoints to prevent abuse
- [ ] Store raw callback payloads in a `mpesa_callbacks` table for audit/debugging
- [ ] Alert landlord on unmatched payments for manual resolution