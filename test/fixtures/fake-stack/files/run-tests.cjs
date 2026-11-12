// Pretends to be a test runner: tests.json holds [{ "name": "...", "status": "passed" | "failed" | "skipped" }].
const fs = require('fs');
const tests = JSON.parse(fs.readFileSync('tests.json', 'utf8'));
const report = {
  testResults: [{
    name: 'tests.json',
    status: tests.some((t) => t.status === 'failed') ? 'failed' : 'passed',
    assertionResults: tests.map((t) => ({
      fullName: t.name,
      status: t.status === 'skipped' ? 'pending' : t.status,
      failureMessages: t.status === 'failed' ? ['expected true, got false\n  at somewhere'] : [],
    })),
  }],
};
fs.writeFileSync('.vibe-rails/tmp/report.json', JSON.stringify(report));
process.exit(tests.some((t) => t.status === 'failed') ? 1 : 0);
