# GitHub Copilot Instructions for Military Medical Committee System (2027)

## Project Overview

This is a comprehensive Military Medical Committee System built with:
- **Frontend**: React 18 + Vite, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers (TypeScript)
- **Database**: PostgreSQL (in production), file-based storage (development)
- **Language**: Bilingual support (Arabic RTL and English)
- **Deployment**: Cloudflare Workers, with support for local development

## Project Structure

- `/src` - Frontend React application
  - `/components` - Reusable UI components
  - `/pages` - Page-level components
  - `/api` - API client and service layer
  - `/core` - Core business logic (routing, queue management, notifications)
  - `/utils` - Utility functions
  - `/types` - TypeScript type definitions
- `/infra/worker-api` - Cloudflare Worker backend API
- `/public` - Static assets
- `/config` - Configuration files
- `/data` - Development data storage
- `/deploy` - Deployment configurations
- `/theme` - Custom theme definitions

## Code Style and Standards

1. **Language Support**: Always consider bilingual support (Arabic/English)
   - Use translation keys or i18n patterns
   - Support RTL layout for Arabic
   - Test UI with both languages

2. **TypeScript**: Use strict TypeScript where possible
   - Define proper types and interfaces
   - Avoid using `any` type
   - Use `.d.ts` files for type definitions

3. **React Best Practices**:
   - Use functional components with hooks
   - Follow component composition patterns
   - Keep components focused and reusable
   - Use proper prop types

4. **Styling**:
   - Use Tailwind CSS utility classes
   - Follow the existing theme system (6 themes available)
   - Maintain consistent spacing and layout
   - Support dark/light mode variations

5. **State Management**:
   - Use React hooks for local state
   - LocalStorage for persistent client-side data
   - Event bus for cross-component communication

6. **API Integration**:
   - All API calls go through `/src/api` layer
   - Handle errors gracefully
   - Support both development and production environments
   - Use proper CORS handling

## Development Workflow

1. **Starting Development**:
   ```bash
   npm install
   npm run dev
   ```

2. **Building for Production**:
   ```bash
   npm run build
   npm start
   ```

3. **Testing**: Run existing tests and ensure compatibility with both languages

## Important Conventions

- **File Naming**: Use kebab-case for files, PascalCase for React components
- **Comments**: Add comments in English for complex logic
- **Documentation**: Update relevant `.md` files when making significant changes
- **Icons**: Use consistent icon system with standard CSS classes
- **Notifications**: Support SSE (Server-Sent Events) for real-time updates

## Key Features

- Queue management system with PIN-based authentication
- Multi-clinic workflow with automatic progression
- Real-time notifications
- Theme switching (6 themes)
- QR code generation
- Admin dashboard
- Patient routing system

## When Making Changes

1. Test with both Arabic and English languages
2. Verify RTL layout for Arabic content
3. Check theme compatibility (light and dark variants)
4. Ensure responsive design works on mobile and desktop
5. Test in both development and production modes
6. Update documentation if changing core functionality
7. Consider backwards compatibility with existing data

## Avoid

- Breaking existing bilingual support
- Hardcoding text strings (use translation system)
- Removing or modifying existing themes without testing all variants
- Making changes that break the queue/routing workflow
- Adding dependencies without considering bundle size
- Ignoring TypeScript errors or using type assertions carelessly
