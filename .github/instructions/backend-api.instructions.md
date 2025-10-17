# Backend API Instructions (Cloudflare Workers)

applyTo:
  - infra/worker-api/**/*.ts
  - infra/worker-api/**/*.js
  - infra/worker-api/src/**

---

## Cloudflare Workers Guidelines

1. **Worker Structure**:
   - Use TypeScript for all worker code
   - Follow Cloudflare Workers API patterns
   - Handle requests with proper HTTP methods
   - Return appropriate status codes and responses

2. **API Design**:
   - Use RESTful conventions
   - Support CORS for frontend integration
   - Version APIs when making breaking changes
   - Document endpoints clearly

3. **Error Handling**:
   - Catch and handle errors gracefully
   - Return consistent error response format
   - Log errors for debugging
   - Don't expose sensitive information in error messages

4. **Performance**:
   - Keep worker execution time minimal
   - Use edge caching when appropriate
   - Optimize database queries
   - Consider cold start performance

5. **Security**:
   - Validate all input data
   - Use proper authentication/authorization
   - Sanitize data before database operations
   - Follow security best practices for API endpoints

6. **Database Operations**:
   - Use parameterized queries to prevent SQL injection
   - Handle database connection errors
   - Use transactions for multi-step operations
   - Consider data consistency

7. **Environment Configuration**:
   - Use wrangler.toml for configuration
   - Support both development and production environments
   - Don't hardcode secrets or credentials
   - Use environment variables

## Response Format

- Return JSON responses with consistent structure
- Include appropriate Content-Type headers
- Use proper HTTP status codes (200, 201, 400, 404, 500, etc.)
- Support both success and error response formats

## What to Avoid

- Blocking operations in workers
- Large response payloads
- Exposing internal error details
- Hardcoded configuration values
- Ignoring TypeScript type checking
