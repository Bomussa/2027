# GitHub Copilot Instructions

This directory contains custom instructions for GitHub Copilot to help it understand and work with this codebase more effectively.

## Files

### Repository-Wide Instructions
- **`copilot-instructions.md`**: Main instructions that apply to the entire repository
  - Project overview and structure
  - Code style and standards
  - Development workflow
  - Key conventions and features

### Path-Specific Instructions
Located in the `instructions/` directory, these provide targeted guidance for specific parts of the codebase:

- **`frontend.instructions.md`**: React/TypeScript frontend code (`src/**`)
  - React component guidelines
  - Bilingual support requirements
  - State management patterns
  - Styling with Tailwind CSS

- **`backend-api.instructions.md`**: Cloudflare Workers backend (`infra/worker-api/**`)
  - Worker structure and API design
  - Error handling and security
  - Database operations
  - Environment configuration

- **`config-utils.instructions.md`**: Configuration files and utilities
  - Package management
  - Build configurations
  - Core business logic
  - Utility functions

- **`documentation.instructions.md`**: Documentation files (`*.md`)
  - Writing style and structure
  - Code examples
  - Formatting standards

- **`tests.instructions.md`**: Test files (`*.test.*`, `*.spec.*`)
  - Test structure and coverage
  - Mocking and assertions
  - React component testing
  - Integration tests

## How GitHub Copilot Uses These Instructions

When you use GitHub Copilot in this repository:

1. **Repository-wide instructions** (`copilot-instructions.md`) are always applied
2. **Path-specific instructions** are applied based on the file you're working in
3. Instructions help Copilot understand:
   - Project context and architecture
   - Coding standards and conventions
   - Common patterns and best practices
   - What to avoid

## Maintaining Instructions

When making significant changes to the project:

1. Update the relevant instruction files
2. Keep instructions clear and concise
3. Focus on "why" not just "what"
4. Include examples for complex patterns
5. Remove outdated information

## Learn More

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Customizing GitHub Copilot](https://docs.github.com/en/copilot/customizing-copilot)
