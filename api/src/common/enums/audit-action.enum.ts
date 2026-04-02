export enum AuditAction {
	// User actions
	USER_CREATED = 'user_created',
	USER_UPDATED = 'user_updated',
	USER_DELETED = 'user_deleted',
	USER_SUSPENDED = 'user_suspended',
	USER_REACTIVATED = 'user_reactivated',
	USER_ROLE_CHANGED = 'user_role_changed',

	// Property actions
	PROPERTY_CREATED = 'property_created',
	PROPERTY_UPDATED = 'property_updated',
	PROPERTY_DELETED = 'property_deleted',

	// Unit actions
	UNIT_CREATED = 'unit_created',
	UNIT_UPDATED = 'unit_updated',

	// Tenant actions
	TENANT_CREATED = 'tenant_created',
	TENANT_UPDATED = 'tenant_updated',
	TENANT_VACATED = 'tenant_vacated',
	TENANT_DELETED = 'tenant_deleted',
	DEPOSIT_REFUNDED = 'deposit_refunded',

	// Invoice actions
	INVOICE_GENERATED = 'invoice_generated',
	INVOICE_UPDATED = 'invoice_updated',
	INVOICE_CANCELLED = 'invoice_cancelled',
	INVOICE_AUTO_SETTLED = 'invoice_auto_settled',
	INVOICE_PARTIALLY_SETTLED = 'invoice_partially_settled',
	INVOICE_DISPUTED = 'invoice_disputed',

	// Payment actions
	PAYMENT_RECEIVED = 'payment_received',
	PAYMENT_FAILED = 'payment_failed',
	PAYMENT_REVERSED = 'payment_reversed',
	STK_PUSH_INITIATED = 'stk_push_initiated',
	ADMIN_STK_PUSH_INITIATED = 'admin_stk_push_initiated',
	STK_PUSH_CALLBACK_SUCCESS = 'stk_push_callback_success',
	STK_PUSH_CALLBACK_FAILED = 'stk_push_callback_failed',
	C2B_PAYMENT_RECEIVED = 'c2b_payment_received',
	C2B_PAYMENT_UNMATCHED = 'c2b_payment_unmatched',
	C2B_URLS_REGISTERED = 'c2b_urls_registered',

	// Wallet actions
	WALLET_CREDITED = 'wallet_credited',
	WALLET_DEBITED = 'wallet_debited',
	WALLET_REFUNDED = 'wallet_refunded',

	// Penalty actions
	PENALTY_APPLIED = 'penalty_applied',

	// Expense actions
	EXPENSE_CREATED = 'expense_created',
	EXPENSE_UPDATED = 'expense_updated',
	EXPENSE_COMPLETED = 'expense_completed',

	// Maintenance actions
	MAINTENANCE_REQUESTED = 'maintenance_requested',
	MAINTENANCE_UPDATED = 'maintenance_updated',
	MAINTENANCE_RESOLVED = 'maintenance_resolved',

	// Communication actions
	NOTIFICATION_SENT = 'notification_sent',
	REMINDER_SENT = 'reminder_sent',
	BULK_REMINDER_SENT = 'bulk_reminder_sent',
	BULK_MESSAGE_SENT = 'bulk_message_sent',

	// Settings actions
	SETTINGS_UPDATED = 'settings_updated',

	// Role and permission actions
	ROLE_CREATED = 'role_created',
	ROLE_UPDATED = 'role_updated',
	ROLE_DELETED = 'role_deleted',

	// Reconciliation actions
	PAYMENT_RECONCILED = 'payment_reconciled',

	// Wallet auto-settlement actions
	WALLET_AUTO_SETTLEMENT_COMPLETED = 'wallet_auto_settlement_completed',

	// Receipt actions
	RECEIPT_GENERATED = 'receipt_generated',

	// Organization actions
	ORGANIZATION_CREATED = 'organization_created',
	ORGANIZATION_UPDATED = 'organization_updated',
	ORGANIZATION_SUSPENDED = 'organization_suspended',
	ORGANIZATION_REACTIVATED = 'organization_reactivated',

	// Subscription actions
	SUBSCRIPTION_CREATED = 'subscription_created',
	SUBSCRIPTION_UPDATED = 'subscription_updated',
	SUBSCRIPTION_CANCELLED = 'subscription_cancelled',

	// Platform actions
	PLATFORM_CONFIG_UPDATED = 'platform_config_updated',
	IMPERSONATION_STARTED = 'impersonation_started',
	IMPERSONATION_ENDED = 'impersonation_ended',

	// Lease Lifecycle actions
	LEASE_EXPIRY_REMINDER = 'lease_expiry_reminder',
	LEASE_AUTO_NOTICE_PERIOD = 'lease_auto_notice_period',
	LEASE_AUTO_VACATED = 'lease_auto_vacated',
	VACANCY_ALERT_SENT = 'vacancy_alert_sent',

	// Escalation actions
	LANDLORD_ESCALATION = 'landlord_escalation',

	// Checklist actions
	CHECKLIST_ITEM_COMPLETED = 'checklist_item_completed',

	// Deposit deduction actions
	DEPOSIT_DEDUCTION_ADDED = 'deposit_deduction_added',

	// Meter reading actions
	METER_READING_CREATED = 'meter_reading_created',
	METER_READING_UPDATED = 'meter_reading_updated',

	// Rent escalation actions
	RENT_ESCALATION_CREATED = 'rent_escalation_created',
	RENT_ESCALATION_APPLIED = 'rent_escalation_applied',
	RENT_ESCALATION_CANCELLED = 'rent_escalation_cancelled',

	// Report/Statement actions
	OWNER_REPORT_GENERATED = 'owner_report_generated',
	STATEMENT_GENERATED = 'statement_generated',

	// Generic CRUD actions
	CREATED = 'created',
	UPDATED = 'updated',
	DELETED = 'deleted',
}
