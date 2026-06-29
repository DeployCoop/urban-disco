# How to Use Test Reports with Cursor

This guide explains how to get test feedback from local runs and GitHub Actions into Cursor for debugging.

## Running Tests Locally for Cursor Feedback

### Quick Commands

```bash
# Run all tests and save detailed output
./scripts/run-tests.sh

# Run only backend tests
pytest tests/ -v --tb=long 2>&1 | tee pytest-output.txt

# Run only frontend tests  
cd frontend && npm test -- --run --reporter=verbose 2>&1 | tee ../vitest-output.txt
```

## Reading Test Output

### Backend Test Failures

When a Python test fails, you'll see:

```
FAILED tests/unit/test_auth.py::test_login - AssertionError: Login should fail
_____________________ test_login _____________________

def test_login():
    result = login("test@example.com", "wrongpassword")
>   assert result is None
E   AssertionError: Expected None but got {'token': 'abc'}

tests/unit/test_auth.py:45: AssertionError
```

**What to tell Cursor:**
```
This test is failing:

File: tests/unit/test_auth.py
Test: test_login
Line: 45
Error: AssertionError - Expected None but got {'token': 'abc'}

The login function should return None for invalid credentials, but it's returning a token.
How do I fix this?
```

### Frontend Test Failures

When a React component test fails:

```
FAIL src/components/__tests__/CasesTable.test.tsx > finds all buttons

AssertionError: expected 0 to be greater than 0

 ❯ src/components/__tests__/CasesTable.test.tsx:25:7
    23|     const buttons = getAllButtons(container);
    24|     console.log(`Found ${buttons.length} buttons`);
  > 25|     expect(buttons.length).toBeGreaterThan(0);
```

**What to tell Cursor:**
```
This frontend test is failing:

Component: CasesTable
Test: "finds all buttons"
File: src/components/__tests__/CasesTable.test.tsx:25
Error: Expected to find buttons but found 0

The test is looking for buttons in the CasesTable component but can't find any.
Is the component rendering correctly? How do I fix this?
```

## Getting GitHub Actions Feedback into Cursor

### Method 1: Copy from GitHub UI

1. Open your Pull Request in GitHub
2. Click on the failing check (e.g., "❌ Unit Tests - Backend")
3. Click "Details" to open the workflow run
4. Find the step that failed and expand it
5. Copy the error section
6. Paste into Cursor chat with context

**Example Cursor prompt:**
```
My GitHub Actions tests are failing. Here's the output:

[paste GitHub Actions output]

I was working on [describe what you changed].
What broke and how do I fix it?
```

### Method 2: Download Logs

1. In GitHub Actions, click the ⚙️ gear icon (top right)
2. Select "Download log archive"
3. Extract the ZIP file
4. Open the relevant `.txt` file
5. Copy the error section to Cursor

### Method 3: GitHub CLI

If you have GitHub CLI installed:

```bash
# List recent workflow runs
gh run list

# View specific run
gh run view [run-id]

# Download logs
gh run download [run-id]
```

Then open the downloaded logs and share with Cursor.

## Common Scenarios

### Scenario 1: Button Not Found

**Error:**
```
TestingLibraryElementError: Unable to find an element with role="button" and name /submit/i
```

**What's happening:**
- Test expects a button with text matching "submit" (case-insensitive)
- Button doesn't exist, or has different text

**How to fix:**
1. Check if button exists in component
2. Check if button text matches
3. Check if button is disabled/hidden when test runs

**Cursor prompt:**
```
I'm getting "Unable to find button with name /submit/i" error.

Here's my test:
[paste test code]

Here's my component:
[paste component code]

Why can't it find the button?
```

### Scenario 2: Async Timing Issues

**Error:**
```
Exceeded timeout of 5000 ms for a test
```

**What's happening:**
- Test waiting for something that never happens
- Data not loading
- Component not updating

**How to fix:**
Use proper async utilities:

```typescript
// ❌ Wrong - doesn't wait
expect(screen.getByText('Loaded')).toBeInTheDocument();

// ✅ Right - waits up to timeout
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// ✅ Also right - findBy automatically waits
const element = await screen.findByText('Loaded');
```

**Cursor prompt:**
```
My test is timing out waiting for an element:

[paste test code]

The component should show "Loaded" after fetching data, but the test times out.
What's wrong with my async handling?
```

### Scenario 3: Mock Not Working

**Error:**
```
expected "spy" to be called at least once
```

**What's happening:**
- Mock function not being called
- Component not using the prop correctly
- Wrong mock setup

**Cursor prompt:**
```
My mock function isn't being called:

Test code:
[paste test]

Component code:
[paste component]

I'm passing onSubmit={mockFn} but it never gets called. Why?
```

## Debugging Workflow

### Step 1: Reproduce Locally

```bash
# Run the exact failing test
pytest tests/unit/test_auth.py::test_login -v

# Or for frontend
npm test -- src/components/__tests__/Login.test.tsx
```

### Step 2: Add Debug Output

```typescript
it('debugs component rendering', () => {
  const { container, debug } = render(<MyComponent />);
  
  // Print entire component tree
  debug();
  
  // Print specific element
  debug(screen.getByRole('button'));
  
  // Log all buttons
  const buttons = getAllButtons(container);
  console.log('Buttons found:', buttons.map(b => b.textContent));
});
```

### Step 3: Run with Verbose Output

```bash
# Python - maximum verbosity
pytest tests/ -vv --tb=long --capture=no

# Frontend - show all console logs
npm test -- --reporter=verbose --no-coverage
```

### Step 4: Share with Cursor

Create a comprehensive prompt:

```
I have a failing test. Here's the context:

WHAT I'M TESTING:
[Component/function name and purpose]

WHAT THE TEST DOES:
[Describe the test]

ERROR MESSAGE:
[Paste full error]

RELEVANT CODE:
[Paste test code and component code]

DEBUG OUTPUT:
[Paste console.log output]

What's wrong and how do I fix it?
```

## Tips for Better Cursor Help

### DO:
✅ Include the full error message
✅ Show the test code AND the component code  
✅ Explain what you expected to happen
✅ Include any debug output
✅ Mention what you recently changed

### DON'T:
❌ Just say "tests are broken"
❌ Only show part of the error
❌ Hide recent changes you made
❌ Skip showing the actual code

## Example: Complete Cursor Interaction

### Your Prompt:
```
My CasesTable tests are failing in CI but pass locally.

GitHub Actions Error:
```
FAIL src/components/__tests__/CasesTable.test.tsx > handles row click
TypeError: Cannot read properties of null (reading 'closest')
```

Test Code:
```typescript
it('handles row click', async () => {
  const user = userEvent.setup();
  render(<CasesTable cases={mockCases} onCaseClick={mockFn} />);
  
  const row = screen.getByText('Case 1').closest('tr');
  await user.click(row);
  
  expect(mockFn).toHaveBeenCalled();
});
```

The test works on my machine but fails in CI. I recently updated the table to use virtualization.
```

### Cursor's Response:
The error suggests `closest('tr')` is returning null in CI. With virtualization, rows might not render immediately. Try:

```typescript
it('handles row click', async () => {
  const user = userEvent.setup();
  render(<CasesTable cases={mockCases} onCaseClick={mockFn} />);
  
  // Wait for row to render
  const caseText = await screen.findByText('Case 1');
  const row = caseText.closest('tr');
  
  if (row) {
    await user.click(row);
    expect(mockFn).toHaveBeenCalled();
  } else {
    // Fallback: click the text directly
    await user.click(caseText);
    expect(mockFn).toHaveBeenCalled();
  }
});
```

## Quick Reference

| Error Type | Likely Cause | First Step |
|------------|--------------|------------|
| `Unable to find element` | Element not rendered or wrong selector | Use `screen.debug()` |
| `Timeout` | Async operation not completing | Add `await waitFor()`  |
| `Mock not called` | Component not using prop | Check prop name spelling |
| `Assertion failed` | Wrong expected value | Add `console.log()` to see actual value |
| `Cannot read property X of null` | Element is null | Check if element exists first |

## Getting More Help

If Cursor's suggestions don't work:

1. Share the full component file
2. Share any related hooks/utilities
3. Mention your testing setup (React 18? MSW?)
4. Include package.json dependencies
5. Show what you've already tried

The more context you provide, the better Cursor can help!

