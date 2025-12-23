
export enum AuditAction {
	// User actions
	USER_SUSPENDED = 'user_suspended',
	USER_REACTIVATED = 'user_reactivated',
	USER_CREATED = 'user_created',
	USER_UPDATED = 'user_updated',
	USER_DELETED = 'user_deleted',
	USER_ROLE_CHANGED = 'user_role_changed',

	// Paper actions
	PAPER_APPROVED = 'paper_approved',
	PAPER_REJECTED = 'paper_rejected',
	PAPER_SUSPENDED = 'paper_suspended',
	PAPER_TAKEN_DOWN = 'paper_taken_down',
	PAPER_REACTIVATED = 'paper_reactivated',

	// Payout actions
	PAYOUT_APPROVED = 'payout_approved',
	PAYOUT_REJECTED = 'payout_rejected',
	PAYOUT_PROCESSED = 'payout_processed',

	// Report actions
	REPORT_RESOLVED = 'report_resolved',
	REPORT_DISMISSED = 'report_dismissed',

	// Settings actions
	SETTINGS_UPDATED = 'settings_updated',
	CREDIT_PACKAGE_CREATED = 'credit_package_created',
	CREDIT_PACKAGE_UPDATED = 'credit_package_updated',
	CREDIT_PACKAGE_DELETED = 'credit_package_deleted',

	// AI Model actions
	AI_MODEL_CREATED = 'ai_model_created',
	AI_MODEL_UPDATED = 'ai_model_updated',
	AI_MODEL_DELETED = 'ai_model_deleted',
	AI_MODEL_DEFAULT_SET = 'ai_model_default_set',
	AI_MODEL_API_KEY_VIEWED = 'ai_model_api_key_viewed',
	AI_MODEL_CONNECTION_TESTED = 'ai_model_connection_tested',

	// Admin actions
	ADMIN_CREATED = 'admin_created',
	ADMIN_ROLE_ASSIGNED = 'admin_role_assigned',
	ADMIN_PERMISSIONS_CHANGED = 'admin_permissions_changed',

	// Role and permission actions
	ROLE_CREATED = 'role_created',
	ROLE_UPDATED = 'role_updated',
	ROLE_DELETED = 'role_deleted',

	// Subscription package actions
	SUBSCRIPTION_PACKAGE_CREATED = 'subscription_package_created',
	SUBSCRIPTION_PACKAGE_UPDATED = 'subscription_package_updated',
	SUBSCRIPTION_PACKAGE_DELETED = 'subscription_package_deleted',

	// Stripe settings actions
	STRIPE_SETTINGS_UPDATED = 'stripe_settings_updated',
	STRIPE_CONNECTION_TESTED = 'stripe_connection_tested',

	// Generic CRUD actions
	CREATED = 'created',
	UPDATED = 'updated',
	DELETED = 'deleted',
}