# MasomoAI - AI-Powered Homework Assistance Platform

A modern, AI-powered homework assistance platform built with Next.js, featuring dynamic subject pages, multi-level navigation, authentication, blog system, admin dashboard, and Stripe integration for subscriptions.

## Features

### Core Features
- **AI Chat Form**: Dynamic homework submission with file upload support
- **Subject Pages**: Dynamic routing for mathematics, physics, chemistry, computer science, etc.
- **Multi-level Navigation**: Organized dropdown menus with subject categories
- **Authentication System**: Login/register forms with Google OAuth support
- **Blog System**: Full-featured blog with categories, tags, and featured posts
- **Admin Dashboard**: Complete management panel for users, questions, and content
- **Stripe Integration**: Subscription management with multiple pricing tiers
- **Responsive Design**: Modern UI with Tailwind CSS and shadcn/ui components

### Technical Features
- **Next.js 14**: App Router with TypeScript
- **Form Validation**: React Hook Form + Zod validation
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React icons
- **Notifications**: Sonner toast notifications

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database (for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   - Database connection string
   - NextAuth.js configuration
   - Stripe API keys
   - OpenAI API key (for AI features)
   - Email configuration

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
ui/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── auth/              # Authentication pages
│   │   ├── blog/              # Blog pages
│   │   ├── subjects/          # Dynamic subject pages
│   │   └── upgrade/           # Pricing/upgrade page
│   ├── components/            # React components
│   │   ├── forms/             # Form components
│   │   ├── layout/            # Layout components
│   │   ├── sections/          # Page sections
│   │   └── ui/                # shadcn/ui components
│   ├── lib/                   # Utility libraries
│   │   ├── stripe/            # Stripe integration
│   │   └── validations/       # Zod schemas
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
└── ...config files
```

## Key Components

### Homepage Sections
- **Hero Section**: AI chat form with gradient background
- **How It Works**: Step-by-step process explanation
- **Subjects Section**: Grid of available subjects
- **AI Tools Section**: Featured tools and capabilities
- **FAQ Section**: Expandable question/answer pairs
- **Blog Section**: Latest blog posts
- **Upgrade CTA**: Premium subscription promotion

### Dynamic Pages
- **Subject Pages**: `/subjects/[slug]` - Mathematics, Physics, etc.
- **Blog Pages**: `/blog` and `/blog/[slug]`
- **Admin Dashboard**: `/admin` with sidebar navigation

### Forms & Validation
- **AI Chat Form**: File upload, subject selection, question input
- **Authentication Forms**: Login/register with validation
- **Admin Forms**: Content management forms

## Styling & Design

### Design System
- **Colors**: Purple/blue gradient theme
- **Typography**: Inter font family
- **Components**: Consistent shadcn/ui components
- **Responsive**: Mobile-first design approach

### Key Design Elements
- Gradient backgrounds and buttons
- Card-based layouts
- Hover animations and transitions
- Modern glassmorphism effects
- Consistent spacing and typography

## Authentication

The platform supports:
- Email/password authentication
- Google OAuth integration
- Protected admin routes
- User session management

## Subscription System

### Plans
- **Free**: Basic features, 1 file upload
- **Premium Monthly**: $9.99/month, unlimited features
- **Premium Yearly**: $99.99/year, 17% savings

### Features by Plan
- File upload limits
- AI chat access
- Priority support
- Advanced tools

## Admin Dashboard

### Features
- User management
- Question monitoring
- Blog post management
- Subject configuration
- Analytics overview
- Subscription management

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Zod for runtime validation

## Deployment

### Environment Setup
1. Set up production database
2. Configure environment variables
3. Set up Stripe webhooks
4. Configure email service
5. Deploy to Vercel/Netlify

### Required Environment Variables
See `.env.example` for complete list of required variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@MasomoAI.com or create an issue in the repository.
