const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("../scripts/ts-loader.cjs");

const {
  SITE_URL,
  SITE_NAME,
  SEO_KEYWORDS,
  absoluteUrl,
  buildPageMetadata,
  buildOrganizationJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildCourseListJsonLd,
  buildCourseDetailJsonLd,
  buildArticleJsonLd,
} = load("lib/seo");
const robots = load("app/robots").default;
const manifest = load("app/manifest").default;
const { articles } = load("data/public-content");
const { publicFaq } = load("data/landing");

test("buildPageMetadata produces canonical URLs, OpenGraph, Twitter Cards, and Googlebot directives", () => {
  const meta = buildPageMetadata({
    title: "Parcours de formation en cybersécurité",
    description: "Apprends la cybersécurité pas à pas avec CyberPingo.",
    path: "/parcours",
    keywords: ["formation cybersécurité"],
  });

  assert.equal(meta.title, "Parcours de formation en cybersécurité");
  assert.equal(meta.alternates.canonical, "/parcours");
  assert.equal(meta.openGraph.url, "/parcours");
  assert.equal(meta.openGraph.siteName, SITE_NAME);
  assert.equal(meta.twitter.card, "summary_large_image");
  assert.equal(meta.robots.index, true);
  assert.equal(meta.robots.follow, true);
  assert.ok(meta.keywords.includes("formation cybersécurité"));
  assert.ok(SEO_KEYWORDS.length >= 15);

  const privateMeta = buildPageMetadata({
    title: "Privé",
    description: "Page privée",
    path: "/parametres",
    noIndex: true,
  });
  assert.equal(privateMeta.robots.index, false);
  assert.equal(privateMeta.robots.follow, false);
});

test("Structured Data JSON-LD generators emit valid Schema.org graphs for Organization, FAQPage, Course, TechArticle, and BreadcrumbList", () => {
  const org = buildOrganizationJsonLd();
  assert.equal(org["@context"], "https://schema.org");
  assert.equal(org["@graph"].length, 2);
  assert.equal(org["@graph"][0]["@type"], "EducationalOrganization");
  assert.equal(org["@graph"][1]["@type"], "WebSite");

  const faq = buildFaqJsonLd(publicFaq);
  assert.equal(faq["@type"], "FAQPage");
  assert.equal(faq.mainEntity.length, publicFaq.length);
  assert.equal(faq.mainEntity[0]["@type"], "Question");

  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: "Accueil", path: "/" },
    { name: "Parcours", path: "/parcours" },
  ]);
  assert.equal(breadcrumbs["@type"], "BreadcrumbList");
  assert.equal(breadcrumbs.itemListElement.length, 2);
  assert.equal(breadcrumbs.itemListElement[1].item, `${SITE_URL}/parcours`);

  const courseList = buildCourseListJsonLd([
    {
      id: "c1",
      slug: "fondamentaux",
      title: "Les bases de la cybersécurité",
      short_description: "Apprends les fondamentaux",
      description: "Apprends les fondamentaux de la cybersécurité.",
      level: "beginner",
      category: "Fondamentaux",
      icon: "shield",
      estimated_duration: 120,
      module_count: 3,
      lesson_count: 12,
      quiz_count: 3,
      completion_xp: 200,
      certificate_enabled: true,
    },
  ]);
  assert.equal(courseList["@type"], "ItemList");
  assert.equal(courseList.itemListElement[0].item["@type"], "Course");
  assert.equal(courseList.itemListElement[0].item.isAccessibleForFree, true);

  const courseDetail = buildCourseDetailJsonLd({
    id: "c1",
    slug: "fondamentaux",
    title: "Les bases de la cybersécurité",
    short_description: "Apprends les fondamentaux",
    description: "Apprends les fondamentaux de la cybersécurité.",
    level: "beginner",
    category: "Fondamentaux",
    icon: "shield",
    estimated_duration: 120,
    module_count: 1,
    lesson_count: 2,
    quiz_count: 1,
    completion_xp: 200,
    certificate_enabled: true,
    modules: [{ id: "m1", title: "Module 1", description: "Intro", position: 1, lessons: [], quizzes: [] }],
    lesson_quizzes: {},
  });
  assert.equal(courseDetail["@type"], "Course");
  assert.equal(courseDetail.syllabusSections.length, 1);

  const article = buildArticleJsonLd(articles[0], "/images/resources/article-securiser-ses-comptes.webp");
  assert.equal(article["@type"], "TechArticle");
  assert.equal(article.url, absoluteUrl(`/ressources/${articles[0].slug}`));
});

test("robots.ts and manifest.ts expose valid search engine crawl rules and PWA manifest", () => {
  const r = robots();
  assert.equal(r.sitemap, `${SITE_URL}/sitemap.xml`);
  assert.ok(Array.isArray(r.rules));
  assert.ok(r.rules[0].allow.includes("/parcours"));
  assert.ok(r.rules[0].disallow.includes("/admin/"));
  assert.ok(r.rules[0].disallow.includes("/api/"));

  const m = manifest();
  assert.equal(m.short_name, SITE_NAME);
  assert.equal(m.lang, "fr-FR");
  assert.ok(m.icons.length >= 2);
});
