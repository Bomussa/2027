# Test Files Instructions

applyTo:
  - "**/*.test.js"
  - "**/*.test.ts"
  - "**/*.test.jsx"
  - "**/*.test.tsx"
  - "**/*.spec.js"
  - "**/*.spec.ts"
  - "**/*.spec.jsx"
  - "**/*.spec.tsx"
  - "**/test/**"
  - "**/tests/**"
  - "**/__tests__/**"

---

## Testing Guidelines

1. **Test Structure**:
   - Use descriptive test names that explain what is being tested
   - Follow Arrange-Act-Assert pattern
   - Group related tests using `describe` blocks
   - Keep tests focused on single behavior
   - Use `beforeEach` and `afterEach` for setup/cleanup

2. **Test Coverage**:
   - Test happy paths and edge cases
   - Test error conditions
   - Test bilingual functionality (Arabic/English)
   - Test RTL layout behavior
   - Test different theme variations when relevant

3. **Mocking**:
   - Mock external dependencies (API calls, file system, etc.)
   - Mock timers when testing time-dependent code
   - Clean up mocks after tests
   - Avoid over-mocking (test real behavior when possible)

4. **Assertions**:
   - Use specific assertions (toBe, toEqual, toContain, etc.)
   - Include meaningful assertion messages
   - Test both positive and negative cases
   - Verify expected side effects

5. **React Component Tests**:
   - Test component rendering
   - Test user interactions (clicks, inputs, etc.)
   - Test conditional rendering
   - Test prop changes
   - Test accessibility features

6. **API/Backend Tests**:
   - Test request/response handling
   - Test error scenarios
   - Test validation logic
   - Test database operations (with test database or mocks)
   - Test authentication/authorization

7. **Integration Tests**:
   - Test component interactions
   - Test data flow through the application
   - Test critical user workflows
   - Test API integration points

## Test Organization

- Place tests next to the code they test, or in a `__tests__` directory
- Use consistent naming conventions (*.test.* or *.spec.*)
- Group tests by feature or component
- Keep test files focused and manageable in size

## Best Practices

- Tests should be fast and independent
- Tests should be deterministic (no flaky tests)
- Use factories or fixtures for test data
- Don't test implementation details, test behavior
- Write tests before fixing bugs (regression tests)
- Keep test code clean and maintainable

## What to Avoid

- Skipping tests without a good reason
- Testing internal implementation details
- Writing tests that depend on other tests
- Using sleep/wait instead of proper async handling
- Hardcoding test data that should be dynamic
- Ignoring test failures
- Writing tests that are hard to understand
