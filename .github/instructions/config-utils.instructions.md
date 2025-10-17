# Configuration and Utility Files Instructions

applyTo:
  - "*.config.js"
  - "*.config.ts"
  - wrangler.toml
  - tsconfig.json
  - package.json
  - src/utils/**
  - src/core/**

---

## Configuration Files

1. **Package Management** (package.json):
   - Document the purpose of new dependencies
   - Consider bundle size impact
   - Use specific version numbers for stability
   - Update scripts with clear descriptions

2. **Build Configuration** (vite.config.js, tsconfig.json):
   - Maintain compatibility with existing build process
   - Test changes in both development and production
   - Document non-obvious configuration choices
   - Keep configurations minimal and focused

3. **Worker Configuration** (wrangler.toml):
   - Follow Cloudflare Workers best practices
   - Support multiple environments
   - Keep secrets out of version control
   - Document environment variables

4. **Styling Configuration** (tailwind.config.js, postcss.config.js):
   - Maintain theme system compatibility
   - Support RTL configurations
   - Keep custom utilities consistent
   - Document theme customizations

## Utility Functions

1. **Code Organization**:
   - Keep utilities focused and single-purpose
   - Use clear, descriptive function names
   - Export utilities properly for reuse
   - Group related utilities together

2. **TypeScript**:
   - Define proper types for parameters and return values
   - Use generics where appropriate
   - Avoid `any` types
   - Document complex type transformations

3. **Error Handling**:
   - Handle edge cases gracefully
   - Throw meaningful errors with context
   - Use try-catch for operations that can fail
   - Log errors appropriately

4. **Testing Considerations**:
   - Write utilities that are easy to test
   - Avoid side effects when possible
   - Make dependencies explicit
   - Consider mocking needs

## Core Business Logic

1. **Queue Management** (src/core/queueManager.ts):
   - Maintain queue integrity
   - Handle concurrent updates safely
   - Support PIN validation logic
   - Preserve patient data consistency

2. **Routing Service** (src/core/routing/):
   - Follow existing routing patterns
   - Support multi-clinic workflow
   - Handle clinic progression logic
   - Maintain route history

3. **Notification System** (src/core/notification-engine.js):
   - Support SSE patterns
   - Handle bilingual notifications
   - Ensure real-time updates work
   - Manage connection lifecycle

4. **Event Bus** (src/core/event-bus.js):
   - Maintain event type consistency
   - Document event payloads
   - Prevent memory leaks (cleanup listeners)
   - Support event debugging

## What to Avoid

- Breaking existing configuration patterns
- Adding unnecessary complexity
- Coupling utilities tightly to specific components
- Ignoring backwards compatibility
- Hardcoding values that should be configurable
