import {
  WalletOutlined,
  FileTextOutlined,
  AlertOutlined,
  MessageOutlined,
  ToolOutlined,
  DashboardOutlined,
  MobileOutlined,
  BankOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  CloudOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';

// ─── Features ───────────────────────────────────────────

export interface Feature {
  icon: typeof WalletOutlined;
  title: string;
  description: string;
  color: string;
  highlighted?: boolean;
}

export const features: Feature[] = [
  {
    icon: WalletOutlined,
    title: 'M-Pesa Wallet System',
    description:
      'Tenants pay via M-Pesa Paybill directly into their wallet. On the 1st of every month, invoices are auto-settled from the wallet balance — zero manual reconciliation.',
    color: '#52c41a',
    highlighted: true,
  },
  {
    icon: FileTextOutlined,
    title: 'Automated Invoicing',
    description:
      'Monthly invoices generated automatically with rent, water, electricity, and custom charges. Partial payments and overpayments handled seamlessly.',
    color: '#1890ff',
  },
  {
    icon: AlertOutlined,
    title: 'Smart Penalty Engine',
    description:
      'Configurable 5% penalty applied automatically after the due date. Tenants receive penalty notices via SMS, keeping collections on track.',
    color: '#faad14',
  },
  {
    icon: MessageOutlined,
    title: 'SMS & Email Notifications',
    description:
      'Automated reminders on the 3rd and 5th of each month. Invoice receipts, penalty notices, and maintenance updates delivered via SMS and email.',
    color: '#1890ff',
  },
  {
    icon: ToolOutlined,
    title: 'Expense & Maintenance Tracking',
    description:
      'Log property expenses by category, assign vendors, and track maintenance requests from tenants. Full audit trail for every shilling spent.',
    color: '#722ed1',
  },
  {
    icon: DashboardOutlined,
    title: 'Multi-Property Dashboard',
    description:
      'Overview of your entire portfolio at a glance — occupancy rates, revenue trends, overdue invoices, and collection performance across all properties.',
    color: '#001529',
  },
];

// ─── Steps (How It Works) ───────────────────────────────

export interface Step {
  number: string;
  title: string;
  description: string;
  icon: typeof WalletOutlined;
}

export const steps: Step[] = [
  {
    number: '01',
    title: 'Set Up Properties & Units',
    description:
      'Add your properties, define units with rent amounts, and assign each property its M-Pesa Paybill number. Import existing tenants in minutes.',
    icon: BankOutlined,
  },
  {
    number: '02',
    title: 'Tenants Pay via M-Pesa',
    description:
      'Tenants pay to your Paybill using their unit number as the account reference. Payments auto-credit to their wallet instantly — no manual matching needed.',
    icon: MobileOutlined,
  },
  {
    number: '03',
    title: 'Invoices Settle Automatically',
    description:
      'On the 1st of each month, invoices are generated and settled from wallet balances. Receipts are sent instantly via SMS. Penalties applied automatically after the due date.',
    icon: CheckCircleOutlined,
  },
];

// ─── Stats ──────────────────────────────────────────────

export interface Stat {
  value: string;
  label: string;
}

export const stats: Stat[] = [
  { value: '96%', label: 'Collection Rate' },
  { value: '500+', label: 'Units Managed' },
  { value: '2 min', label: 'Average Setup Time' },
  { value: 'KES 2.4M+', label: 'Rent Processed Monthly' },
];

// ─── Tenant Portal ──────────────────────────────────────

export const tenantFeatures: string[] = [
  'View invoices and payment history',
  'Pay rent directly via M-Pesa STK Push',
  'Track wallet balance and transactions',
  'Submit maintenance requests with photos',
  'Download receipts as PDF',
];

// ─── Pain Points ────────────────────────────────────────

export interface PainPoint {
  icon: typeof WalletOutlined;
  title: string;
  description: string;
}

export const painPoints: PainPoint[] = [
  {
    icon: MessageOutlined,
    title: 'Chasing tenants on WhatsApp every month',
    description:
      'You spend the first week of every month sending "Rent is due" messages, following up, and checking who has paid.',
  },
  {
    icon: FileTextOutlined,
    title: 'Matching M-Pesa payments in spreadsheets',
    description:
      'Scrolling through M-Pesa statements, copy-pasting transaction codes, and manually updating your Excel tracker.',
  },
  {
    icon: AlertOutlined,
    title: 'Forgetting to apply late penalties',
    description:
      'Some tenants pay late every month because there are no consequences. You lose thousands in uncollected penalties.',
  },
  {
    icon: DashboardOutlined,
    title: 'No idea which properties are profitable',
    description:
      'Between rent collection, maintenance costs, and vacancies, you cannot tell which properties are making money.',
  },
];

// ─── Animated Flow Steps ────────────────────────────────

export interface FlowStep {
  label: string;
  detail: string;
  amount?: string;
}

export const flowSteps: FlowStep[] = [
  {
    label: 'Tenant Sends Payment',
    detail: 'M-Pesa Paybill 123456, Account A-101',
    amount: 'KES 38,700',
  },
  {
    label: 'Payment Confirmed',
    detail: 'Daraja C2B callback received',
    amount: 'Ref: RKTQDM7W6S',
  },
  {
    label: 'Wallet Credited',
    detail: 'Balance: KES 0 → KES 38,700',
    amount: '+KES 38,700',
  },
  {
    label: 'Invoice Auto-Settled',
    detail: 'Receipt sent via SMS',
    amount: 'KES 0 due',
  },
];

// ─── Comparison Table ───────────────────────────────────

export interface ComparisonRow {
  feature: string;
  manual: string;
  rentflow: string;
}

export const comparisonRows: ComparisonRow[] = [
  {
    feature: 'Invoice Generation',
    manual: 'Manual / Excel',
    rentflow: 'Automated monthly',
  },
  {
    feature: 'Payment Tracking',
    manual: 'Check M-Pesa statements',
    rentflow: 'Real-time via Paybill',
  },
  {
    feature: 'Late Penalty Calculation',
    manual: 'Often forgotten',
    rentflow: 'Auto-applied after due date',
  },
  {
    feature: 'Tenant Communication',
    manual: 'WhatsApp / phone calls',
    rentflow: 'Automated SMS & email',
  },
  {
    feature: 'Expense Tracking',
    manual: 'Paper receipts / notebook',
    rentflow: 'Categorized with vendor tracking',
  },
  {
    feature: 'Reporting & Analytics',
    manual: 'None or basic Excel',
    rentflow: 'Real-time dashboard & trends',
  },
];

// ─── Pricing ────────────────────────────────────────────

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    name: 'Starter',
    price: 'KES 1,000',
    period: '/month',
    description: 'For landlords with up to 20 units',
    features: [
      'Up to 20 units',
      'M-Pesa wallet integration',
      'Automated invoicing',
      'SMS notifications',
      'Penalty engine',
      'Basic reporting',
    ],
  },
  {
    name: 'Professional',
    price: 'KES 3,500',
    period: '/month',
    description: 'For landlords with 20+ units',
    features: [
      'Unlimited units',
      'Everything in Starter',
      'Expense & maintenance tracking',
      'Advanced dashboard & analytics',
      'Priority support',
      'Multi-property management',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large-scale property management',
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'On-site training',
    ],
  },
];

// ─── Testimonials ───────────────────────────────────────

export interface Testimonial {
  name: string;
  role: string;
  location: string;
  quote: string;
  result: string;
  initials: string;
  color: string;
}

export const testimonials: Testimonial[] = [
  {
    name: 'James Mwangi',
    role: '12 properties in Nairobi',
    location: 'Westlands, Nairobi',
    quote:
      'Before RentFlow, I spent the first 10 days of every month chasing rent. Now payments come in automatically and I get an SMS when each invoice is settled.',
    result: 'Collection rate went from 78% to 96%',
    initials: 'JM',
    color: '#1890ff',
  },
  {
    name: 'Grace Wanjiku',
    role: '6 properties across Mombasa',
    location: 'Nyali, Mombasa',
    quote:
      'The wallet system is brilliant. Tenants top up via M-Pesa anytime, and on the 1st the system handles everything. I barely touch the rent process now.',
    result: 'Saved 15+ hours per month on admin',
    initials: 'GW',
    color: '#52c41a',
  },
  {
    name: 'Peter Ochieng',
    role: '3 properties in Kisumu',
    location: 'Milimani, Kisumu',
    quote:
      'The penalty engine alone paid for the subscription. Tenants pay on time now because they know the 5% penalty is automatic — no negotiating.',
    result: 'Late payments dropped by 60%',
    initials: 'PO',
    color: '#722ed1',
  },
];

// ─── FAQ ────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: 'Is my M-Pesa payment data secure?',
    answer:
      'Absolutely. RentFlow uses 256-bit encryption for all data in transit and at rest. We integrate directly with Safaricom\'s Daraja API using their official security protocols. We never store M-Pesa PINs or sensitive payment credentials.',
  },
  {
    question: 'How long does it take to set up?',
    answer:
      'Most landlords are fully set up within 30 minutes. Add your properties, create units, and invite tenants. Once your M-Pesa Paybill is configured, payments start flowing in automatically.',
  },
  {
    question: 'Can I manage multiple properties?',
    answer:
      'Yes. RentFlow is built for multi-property management. Each property can have its own M-Pesa Paybill number, and you get a unified dashboard to see performance across all properties.',
  },
  {
    question: 'Do my tenants need to install an app?',
    answer:
      'No. Tenants pay using standard M-Pesa Pay Bill on their phone — no app or smartphone required. They also get a web portal for viewing invoices, receipts, and submitting maintenance requests.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes. We offer a 14-day free trial with full access to all features. No credit card required. Request a demo and our team will help you get started.',
  },
  {
    question: 'What kind of support do you offer?',
    answer:
      'We offer email and phone support during business hours (Mon-Fri, 8AM-6PM EAT). Professional and Enterprise plans include priority support with faster response times. Enterprise customers get a dedicated account manager.',
  },
];

// ─── Trust / Social Proof ───────────────────────────────

export interface TrustBadge {
  icon: typeof SafetyOutlined;
  label: string;
}

export const trustBadges: TrustBadge[] = [
  { icon: SafetyOutlined, label: '256-bit Encryption' },
  { icon: CreditCardOutlined, label: 'M-Pesa Certified' },
  { icon: CloudOutlined, label: '99.9% Uptime' },
  { icon: CustomerServiceOutlined, label: '24/7 Support' },
];

// ─── Footer ─────────────────────────────────────────────

export interface FooterLinkGroup {
  title: string;
  links: { label: string; href: string; onClick?: boolean }[];
}

export const footerLinks: FooterLinkGroup[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Request Demo', href: '#', onClick: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQ', href: '#faq' },
      { label: 'Documentation', href: '#' },
      { label: 'Support', href: '#' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: 'info@rentflow.co.ke', href: 'mailto:info@rentflow.co.ke' },
      { label: '+254 700 000 000', href: 'tel:+254700000000' },
      { label: 'Nairobi, Kenya', href: '#' },
    ],
  },
];
