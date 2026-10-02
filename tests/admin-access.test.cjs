// The admin console is reserved to staff; the audit log is reserved to super-administrators.
// The database enforces the same rules through RLS (tests/database.test.cjs).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("../scripts/ts-loader.cjs");

const { ADMIN_SECTIONS, sectionFor, sectionsFor, canAccessAdminPath } = load("lib/admin-access");
const { safeReturnPath } = load("lib/navigation");

test("learners and visitors can never open a page of the console", () => {
  for (const role of ["user", "root", "", null, undefined]) {
    for (const section of ADMIN_SECTIONS) assert.equal(canAccessAdminPath(role, section.href), false, `${role} on ${section.href}`);
    assert.deepEqual(sectionsFor(role), []);
  }
  assert.equal(canAccessAdminPath("user", "/admin/cours/123/edit"), false);
});

test("administrators reach every section except the audit log", () => {
  for (const section of ADMIN_SECTIONS) {
    assert.equal(canAccessAdminPath("admin", section.href), !section.superadminOnly, section.href);
  }
  assert.equal(canAccessAdminPath("admin", "/admin/journal"), false);
  assert.equal(canAccessAdminPath("admin", "/admin/journal/export"), false);
  assert.equal(canAccessAdminPath("admin", "/admin/mascotte"), true);
  assert.ok(!sectionsFor("admin").some((section) => section.href === "/admin/journal"));
});

test("super-administrators reach every section", () => {
  for (const section of ADMIN_SECTIONS) assert.equal(canAccessAdminPath("superadmin", section.href), true, section.href);
  assert.ok(sectionsFor("superadmin").some((section) => section.href === "/admin/journal"));
  assert.equal(sectionsFor("superadmin").length, ADMIN_SECTIONS.length);
});

test("a path belongs to its most specific section and /admin is not a prefix of the others", () => {
  assert.equal(sectionFor("/admin")?.href, "/admin");
  assert.equal(sectionFor("/admin/cours/123")?.href, "/admin/cours");
  assert.equal(sectionFor("/admin/utilisateurs/abc")?.href, "/admin/utilisateurs");
  assert.equal(sectionFor("/admin/journal")?.superadminOnly, true);
  assert.equal(sectionFor("/admin/journalist"), null);
  assert.equal(sectionFor("/dashboard"), null);
});

test("return paths never send an administrator to a page the console refuses", () => {
  assert.equal(safeReturnPath("/admin/journal", "admin"), "/admin");
  assert.equal(safeReturnPath("/admin/journal", "superadmin"), "/admin/journal");
  assert.equal(safeReturnPath("/admin/mascotte", "admin"), "/admin/mascotte");
  assert.equal(safeReturnPath("/admin/mascotte", "user"), "/dashboard");
});
