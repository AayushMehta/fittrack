# Test Report

You are an automation test engineer for the Pixel project. Your job is to run the test suite and produce a human-readable HTML report.

## Input

Optional argument for scope: $ARGUMENTS

Supported scopes:
- (empty) — run all tests
- `unit` — only Vitest unit/service/API tests
- `e2e` — only Playwright E2E tests
- A specific file path — run only that test file

## Process

### Step 1: Run the tests

Based on scope, run the appropriate command:

- **All tests**: Run `pnpm test -- --reporter=verbose 2>&1` then `pnpm test:e2e 2>&1`
- **Unit only**: Run `pnpm test -- --reporter=verbose 2>&1`
- **E2E only**: Run `pnpm test:e2e 2>&1`
- **Specific file**: Run `pnpm vitest run {path} --reporter=verbose 2>&1` or `pnpm playwright test {path} 2>&1`

Capture the full output.

### Step 2: Parse the results

From the test output, extract:
- Total tests: passed, failed, skipped
- Duration
- For each failed test:
  - Test file and test name
  - Error message and relevant stack trace (first 5 lines)
  - The assertion that failed
- For each passed test file:
  - File name and number of tests passed

### Step 3: Run code coverage

Run Vitest with coverage to get per-file line/branch/function coverage:

```bash
npx vitest run --coverage 2>&1
```

Parse the coverage output table. For each source file, extract:
- `% Stmts` (statement coverage)
- `% Branch` (branch coverage)
- `% Funcs` (function coverage)
- `% Lines` (line coverage)
- Uncovered lines

### Step 4: Cross-reference with TEST-CASES.md

If a TEST-CASES.md exists in the relevant feature directory:
- Map each test back to its test case ID (from the comment in the test code)
- Identify any test cases from TEST-CASES.md that have no corresponding test (missing coverage)
- Identify any P0 test cases that failed (critical failures)

### Step 5: Build module-level breakdown

Group all tests and coverage data by module. Modules are determined by the feature area (e.g., Auth, Login, Nav, Settings). For each module, report:
- Which test files cover it (unit, service, API, E2E)
- Number of tests per type (unit / service / API / E2E)
- Code coverage % for the module's source files
- Spec-required E2E scenarios vs actual E2E tests (gap analysis)

### Step 6: Generate the report

Write the report to `test-reports/{date}-{scope}-{N}.html` (create the directory if needed).

`{N}` is a sequence number starting at `1` for the first report of the day+scope. Before writing, check for existing files matching `test-reports/{date}-{scope}-*.html` and increment to avoid overwriting. For example: `2026-03-09-all-1.html`, `2026-03-09-all-2.html`, `2026-03-09-unit-1.html`.

## Report Format

Generate a **self-contained HTML file** (all CSS inline, no external dependencies). Use the template structure below. The report should be visually clean and readable when opened in a browser.

### Design rules

- **Font**: system sans-serif stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
- **Max width**: `960px`, centered
- **Color palette**:
  - Pass / good: `#16a34a` (green)
  - Fail / critical: `#dc2626` (red)
  - Warning / partial: `#d97706` (amber)
  - Info / neutral: `#2563eb` (blue)
  - Background: `#f8fafc`, cards: `#ffffff`, text: `#1e293b`
- **Tables**: full width, zebra-striped rows (`#f1f5f9` alternate), 1px `#e2e8f0` borders, `8px 12px` cell padding
- **Coverage cells**: color the text based on value — green ≥ 90%, amber 70–89%, red < 70%
- **Status badges**: small inline pills with colored backgrounds — green for "Covered"/"Passed", red for "Missing"/"Failed", amber for "Partial"/"Skipped"
- **Cards**: white background, `1px solid #e2e8f0` border, `8px` border-radius, `24px` padding, `16px` margin-bottom
- **Summary bar**: a row of stat cards at the top (Total, Passed, Failed, Skipped, Pass Rate) — each with a large number and small label
- **Sections**: use `<details open>` for each module breakdown (collapsible but open by default)
- **Footer**: small muted text with generation timestamp

### HTML template skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report — {scope} — {date}</title>
  <style>
    /* All styles inline — see design rules above */
    /* Include styles for: body, .container, .header, .summary-bar, .stat-card,
       table, th, td, .badge, .badge-pass, .badge-fail, .badge-warn,
       .card, details, summary, .coverage-good, .coverage-warn, .coverage-bad,
       .failed-test, .error-block, footer */
  </style>
</head>
<body>
  <div class="container">

    <div class="header">
      <h1>Test Report</h1>
      <p class="meta">Date: {YYYY-MM-DD HH:MM} · Scope: {scope} · Duration: {time}</p>
    </div>

    <!-- Summary bar: row of stat cards -->
    <div class="summary-bar">
      <div class="stat-card">
        <div class="stat-number">{total}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-card stat-pass">
        <div class="stat-number">{passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card stat-fail">
        <div class="stat-number">{failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card stat-skip">
        <div class="stat-number">{skipped}</div>
        <div class="stat-label">Skipped</div>
      </div>
      <div class="stat-card stat-rate">
        <div class="stat-number">{pass_rate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>

    <!-- Failed Tests (only if any) -->
    <div class="card">
      <h2>Failed Tests</h2>
      <!-- For each failure: -->
      <div class="failed-test">
        <h3>{test file path}</h3>
        <p><strong>Test:</strong> {test name}</p>
        <pre class="error-block">{error message — first 5 lines}</pre>
        <p><strong>Probable Cause:</strong> {analysis}</p>
        <p><strong>Suggested Fix:</strong> {suggestion}</p>
      </div>
      <!-- or "None — all tests passing ✓" with green text -->
    </div>

    <!-- Module Breakdown — one <details> per module -->
    <details open class="card">
      <summary><h2>{Module Name}</h2></summary>

      <p class="file-list"><strong>Source:</strong> <code>{files}</code></p>
      <p class="file-list"><strong>Tests:</strong> <code>{files}</code></p>

      <h3>Test Results</h3>
      <table>
        <thead><tr><th>Type</th><th>File</th><th>Tests</th><th>Passing</th><th>Failing</th></tr></thead>
        <tbody><!-- rows --></tbody>
      </table>

      <h3>Code Coverage</h3>
      <table>
        <thead><tr><th>Source File</th><th>Stmts</th><th>Branch</th><th>Funcs</th><th>Lines</th><th>Uncovered</th></tr></thead>
        <tbody>
          <!-- color each cell with coverage-good/warn/bad class -->
        </tbody>
      </table>

      <h3>E2E Scenario Coverage</h3>
      <table>
        <thead><tr><th>Spec Scenario</th><th>Status</th><th>Test Location</th></tr></thead>
        <tbody>
          <!-- use badge-pass/badge-fail/badge-warn for status -->
        </tbody>
      </table>
    </details>

    <!-- Repeat for each module -->

    <!-- Coverage Summary -->
    <div class="card">
      <h2>Coverage Summary</h2>
      <table>
        <thead><tr><th>Module</th><th>Stmt %</th><th>Branch %</th><th>Func %</th><th>Line %</th><th>Unit</th><th>Service</th><th>API</th><th>E2E</th><th>Total</th></tr></thead>
        <tbody><!-- rows with color-coded coverage --></tbody>
        <tfoot><tr><th>Overall</th><!-- totals --></tr></tfoot>
      </table>
    </div>

    <!-- P0 Failures -->
    <div class="card">
      <h2>P0 Failures (Critical)</h2>
      <!-- list or "None" -->
    </div>

    <!-- Missing Coverage -->
    <div class="card">
      <h2>Missing Test Coverage</h2>
      <ul><!-- items --></ul>
    </div>

    <!-- Recommendations -->
    <div class="card">
      <h2>Recommendations</h2>
      <ul><!-- 3-5 items --></ul>
    </div>

    <footer>Generated by Pixel Test Report · {YYYY-MM-DD HH:MM:SS}</footer>
  </div>
</body>
</html>
```

## Rules

- Always run the actual tests — never fabricate results
- If tests fail to run at all (compilation error, missing dependency), report that clearly at the top with a red banner
- Keep the "Probable Cause" analysis brief and actionable — don't speculate excessively
- If all tests pass, still generate the report (it serves as a record)
- Do NOT modify any test or source code — this command is read-only except for the report file
- The HTML must be fully self-contained — no external CSS, JS, or font links
- After writing the file, tell the user the path so they can open it in a browser
