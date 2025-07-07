# CreditAI - AI-Powered Credit Repair Platform

A modern, mobile-first credit repair and monitoring SaaS application built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **AI-Powered Credit Analysis** - Advanced AI analysis of credit reports to identify FCRA violations
- **Smart Dispute Generation** - Automated generation of E-OSCAR optimized dispute letters
- **Real-time Monitoring** - Track credit score changes and dispute status in real-time
- **Mobile-First Design** - Responsive design optimized for mobile devices
- **Progressive Web App** - PWA support for offline functionality
- **Secure & Compliant** - FCRA and CROA compliant with enterprise-grade security

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with MFA
- **State Management**: Zustand + React Query
- **Form Handling**: React Hook Form + Zod validation
- **Testing**: Jest + Testing Library
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18.17.0 or later
- npm 9.0.0 or later
- Git

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/creditai.git
cd creditai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.local.template .env.local
```

Edit `.env.local` and fill in your actual values:

```env
# Required for basic functionality
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Required for AI features
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Required for payments (if using Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 4. Set up the database

```bash
# Run the Supabase setup script
npm run setup-supabase

# Or manually set up Supabase:
# 1. Install Supabase CLI: npm install -g supabase
# 2. Login: supabase login
# 3. Link project: supabase link --project-ref your-project-ref
# 4. Push migrations: supabase db push
# 5. Create storage bucket: supabase storage create credit-reports
```

**Note**: If you see 404 errors related to `track_user_event`, `upload_analytics`, or other Supabase functions, it means the database schema hasn't been applied yet. Follow the setup instructions above to resolve these errors.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── (auth)/         # Authentication pages
│   ├── (dashboard)/    # Protected dashboard pages
│   ├── api/            # API routes
│   └── globals.css     # Global styles
├── components/         # React components
│   ├── ui/            # Base UI components
│   ├── forms/         # Form components
│   ├── layout/        # Layout components
│   └── features/      # Feature-specific components
├── lib/               # Utility libraries
│   ├── utils/         # General utilities
│   ├── validations/   # Zod schemas
│   ├── api/          # API client functions
│   ├── auth/         # Authentication logic
│   └── constants.ts   # App constants
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── styles/            # CSS and styling files
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:ci
```

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm test` - Run tests
- `npm run clean` - Clean build artifacts

## 🌍 Environment Variables

See `.env.local.template` for a complete list of environment variables. Key variables include:

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### Optional but Recommended
- `OPENAI_API_KEY` - For AI-powered features
- `SENDGRID_API_KEY` - For email notifications
- `STRIPE_SECRET_KEY` - For payment processing

## 📱 Mobile Development

This app is designed mobile-first with:

- Touch-friendly interface elements
- Responsive grid layouts
- Optimized form inputs for mobile
- PWA support for app-like experience
- Safe area handling for iOS devices

## 🔒 Security

- HTTPS enforced in production
- Content Security Policy headers
- Input validation with Zod
- SQL injection protection with Supabase RLS
- XSS protection with proper sanitization
- Rate limiting on API endpoints

## 📊 Performance

- Next.js 14 App Router for optimal performance
- Image optimization with next/image
- Bundle splitting and code splitting
- Service worker for caching (PWA)
- Database query optimization

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

```bash
npm run build
```

### Other Platforms

The app can be deployed to any platform that supports Node.js:

- Netlify
- Railway
- Heroku
- AWS Amplify
- Google Cloud Run

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Documentation: [docs.creditai.com](https://docs.creditai.com)
- Issues: [GitHub Issues](https://github.com/your-org/creditai/issues)
- Email: support@creditai.com
- Discord: [Join our community](https://discord.gg/creditai)

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

---

Built with ❤️ by the CreditAI Team