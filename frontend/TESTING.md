# Testing Documentation

## Jest + React Testing Library Setup

This project uses Jest with React Testing Library for unit and integration testing.

## Quick Start

```bash
# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern="example.test"
```

## Project Structure

```
frontend/
├── jest.config.cjs         # Jest configuration (CommonJS)
├── babel.config.cjs        # Babel config for JSX transformation
├── src/
│   ├── setupTests.js       # Global test setup (mocks, etc.)
│   ├── __mocks__/          # Module mocks
│   │   ├── styleMock.js    # CSS import mock
│   │   ├── fileMock.js     # Static asset mock
│   │   ├── react-router-dom.js  # Router mock
│   │   └── AuthContext.js  # Auth context mock
│   └── __tests__/          # Test files
│       ├── testUtils.jsx   # Custom render utilities
│       └── example.test.jsx # Example tests
```

## Writing Tests

### Basic Component Test

```jsx
import { render, screen } from '../__tests__/test-utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Testing with Auth Context

```jsx
import { render, screen } from '../__tests__/test-utils';
import ProtectedComponent from './ProtectedComponent';

it('shows content for authenticated users', () => {
  render(<ProtectedComponent />, {
    authContext: {
      user: { full_name: 'Test User', role: 'admin' },
      isAuthenticated: true,
    },
  });
  
  expect(screen.getByText(/Welcome, Test User/)).toBeInTheDocument();
});
```

### Testing API Calls

```jsx
import { render, screen, waitFor, mockFetchOnce } from '../__tests__/test-utils';
import DataComponent from './DataComponent';

it('fetches and displays data', async () => {
  mockFetchOnce({ success: true, data: [{ id: 1, name: 'Item 1' }] });
  
  render(<DataComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```jsx
import { render, screen, fireEvent } from '../__tests__/test-utils';
import Form from './Form';

it('submits form data', () => {
  const onSubmit = jest.fn();
  render(<Form onSubmit={onSubmit} />);
  
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'test@example.com' },
  });
  
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
});
```

## Custom Render Utilities

The `test-utils.jsx` file provides custom render functions:

- **`render()`** - Renders with all providers (Router + Auth)
- **`renderWithRouter()`** - Renders with only Router
- **`mockFetchOnce()`** - Mocks a single fetch call
- **`mockFetchError()`** - Mocks a fetch error
- **`createMockApiResponse()`** - Creates mock API response

## Mocking Patterns

### Mocking a Module

```jsx
// In your test file
jest.mock('../utils/api', () => ({
  fetchData: jest.fn(),
}));

import { fetchData } from '../utils/api';

beforeEach(() => {
  fetchData.mockResolvedValue({ success: true });
});
```

### Mocking React Router Navigation

```jsx
import { mockNavigate } from '../__mocks__/react-router-dom';

it('navigates on button click', () => {
  render(<MyComponent />);
  
  fireEvent.click(screen.getByText('Go to Dashboard'));
  
  expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
});
```

## Coverage

Run coverage report with:

```bash
npm run test:coverage
```

Coverage thresholds are set in `jest.config.js`:
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

## Best Practices

1. **Test behavior, not implementation** - Focus on what users see and do
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Keep tests isolated** - Each test should be independent
4. **Mock external dependencies** - Don't make real API calls in tests
5. **Write descriptive test names** - Describe what the test verifies
6. **Test edge cases** - Error states, loading states, empty states

## Common Queries

| Query | When to Use |
|-------|-------------|
| `getByRole` | Buttons, links, headings, form elements |
| `getByLabelText` | Form inputs with labels |
| `getByText` | Text content |
| `getByTestId` | Last resort when no semantic query works |
| `queryBy*` | When element might not exist |
| `findBy*` | Async operations (returns Promise) |
