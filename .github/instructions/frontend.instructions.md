# Frontend Code Instructions

applyTo:
  - src/**/*.jsx
  - src/**/*.tsx
  - src/**/*.js
  - src/**/*.ts
  - src/components/**
  - src/pages/**

---

## React Component Guidelines

1. **Component Structure**:
   - Use functional components with hooks
   - Export components as default when they are the main component in a file
   - Keep components focused on a single responsibility
   - Use proper JSX formatting with consistent indentation

2. **Bilingual Support**:
   - All user-facing text must support Arabic and English
   - Use the translation system or language state
   - Test RTL layout for Arabic
   - Consider text direction in layout and styling

3. **State Management**:
   - Use `useState` for local component state
   - Use `useEffect` for side effects and cleanup
   - Use `useContext` when sharing state across components
   - Leverage the event bus for cross-component communication

4. **Styling with Tailwind**:
   - Use Tailwind utility classes for styling
   - Follow the theme system (6 available themes)
   - Use `rtl:` prefix for RTL-specific styles
   - Maintain consistent spacing using Tailwind's spacing scale
   - Use the existing icon system with standard CSS classes

5. **Props and TypeScript**:
   - Define prop types explicitly using TypeScript interfaces
   - Use destructuring for props
   - Provide default values where appropriate
   - Document complex props with JSDoc comments

6. **Accessibility**:
   - Use semantic HTML elements
   - Include proper ARIA labels
   - Ensure keyboard navigation works
   - Test with screen readers when possible

7. **Performance**:
   - Use `useMemo` and `useCallback` for expensive computations
   - Avoid unnecessary re-renders
   - Lazy load components when appropriate
   - Keep bundle size in mind

## Common Patterns

- **API Calls**: Always use the API client from `/src/api`
- **Error Handling**: Show user-friendly error messages in both languages
- **Loading States**: Display loading indicators during async operations
- **Forms**: Validate inputs and provide clear error messages
- **Icons**: Use the consistent icon system (size, color, spacing classes)

## What to Avoid

- Hardcoded text strings (always support bilingual)
- Inline styles (use Tailwind classes)
- Direct DOM manipulation (use React refs when needed)
- Large component files (split into smaller components)
- Ignoring TypeScript errors
