# TAO SDLC Frontend - React + TypeScript

## Overview
Modern, interactive UI for the AI-Augmented Software Development Lifecycle Management System.

## Features
- 🎨 Beautiful UI with Tailwind CSS
- 🔄 Real-time updates
- 🤖 AI Copilot integration
- 📊 Interactive phase management
- ✅ Approval workflow system
- 📱 Responsive design

## Tech Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Navigation
- **Axios** - API client
- **Lucide React** - Icons

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

### Build for Production
```bash
npm run build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/         # Reusable components
│   │   ├── common/        # Layout, Header, Sidebar
│   │   ├── phase/         # Phase navigator
│   │   └── ai-copilot/    # AI chat interface
│   ├── pages/             # Page components for each phase
│   ├── services/          # API services
│   ├── store/             # Zustand state management
│   ├── types/             # TypeScript types
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── public/                # Static assets
└── package.json
```

## Pages & Routes

- `/` - Dashboard (project overview)
- `/projects/:id` - Project details
- `/projects/:id/phase1` - PRD & FSD
- `/projects/:id/phase2` - Architecture & Design
- `/projects/:id/phase3` - Product Backlog
- `/projects/:id/phase4` - Development
- `/projects/:id/phase5` - QA & Testing
- `/approvals` - Approval Center

## Features by Phase

### Phase 1: PRD & FSD
- AI-powered document generation
- Stakeholder assignment
- Multi-level approval workflow

### Phase 2: Architecture & Design
- Visual architecture canvas
- Component design mapping
- Infrastructure blueprinting
- Security architecture

### Phase 3: Product Backlog
- BR to Epics conversion
- User story generation
- Sprint planning
- Jira integration

### Phase 4: Development
- Parallel backend/frontend tracks
- AI code generation
- Unit test generation
- Code review workflow

### Phase 5: QA & Testing
- Test case management
- Security testing
- Performance testing
- Coverage reports

## AI Copilot Features

- **Context-aware suggestions**
- **Confidence scoring**
- **Alternative recommendations**
- **Inline explanations**
- **Feedback mechanism**

## Configuration

The frontend proxies API requests to the backend:
- Development: http://localhost:8000
- Configure in `vite.config.ts`

## Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Customization

### Colors
Edit `tailwind.config.js` to customize the color scheme.

### API Endpoint
Edit `src/services/api.ts` to change the API base URL.

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

