const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const WORD_NUMBERS = {
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six_en: 6,
};

function getRequiredAnswersCount(question) {
  if (question.question_type !== "multiple_choice") {
    return 1;
  }
  const prompt = question.prompt ?? "";
  const explicitNumMatch = prompt.match(/\((\d+)\s+(?:réponses?|answers?|choix)/i);
  if (explicitNumMatch && explicitNumMatch[1]) {
    const num = parseInt(explicitNumMatch[1], 10);
    if (!Number.isNaN(num) && num >= 2) return num;
  }
  const digitRuleMatch = prompt.match(/(?:les|the)\s+(\d+)\s+(?:réponses?|choix|options?|règles?|mesures?|protocoles?|mécanismes?|vecteurs?|vulnérabilités?)/i);
  if (digitRuleMatch && digitRuleMatch[1]) {
    const num = parseInt(digitRuleMatch[1], 10);
    if (!Number.isNaN(num) && num >= 2) return num;
  }
  for (const [word, value] of Object.entries(WORD_NUMBERS)) {
    const wordRegex = new RegExp(`(?:les|the)\\s+${word}\\s+(?:réponses?|choix|options?|règles?|mesures?|protocoles?|mécanismes?|vecteurs?|vulnérabilités?)`, "i");
    if (wordRegex.test(prompt)) {
      return value;
    }
  }
  return 2;
}

function validateQuestionAnswers(question, selectedAnswerIds) {
  const selected = selectedAnswerIds?.length ?? 0;
  const required = getRequiredAnswersCount(question);
  const isSatisfied = selected >= required;
  const missing = Math.max(0, required - selected);

  let label = "1 réponse requise";
  if (question.question_type === "multiple_choice") {
    label = `${required} réponses requises (${selected}/${required})`;
  } else if (selected > 0) {
    label = "1 sélectionnée";
  }

  return { isSatisfied, required, selected, missing, label };
}

test("Single choice and true/false require exactly 1 answer", () => {
  const q1 = { question_type: "single_choice", prompt: "Quelle est l'adresse de loopback IPv4 ?" };
  assert.equal(getRequiredAnswersCount(q1), 1);
  assert.equal(validateQuestionAnswers(q1, []).isSatisfied, false);
  assert.equal(validateQuestionAnswers(q1, ["a1"]).isSatisfied, true);

  const q2 = { question_type: "true_false", prompt: "HTTPS utilise par défaut le port 443." };
  assert.equal(getRequiredAnswersCount(q2), 1);
  assert.equal(validateQuestionAnswers(q2, []).isSatisfied, false);
  assert.equal(validateQuestionAnswers(q2, ["a1"]).isSatisfied, true);
});

test("Multiple choice questions require at least 2 answers by default", () => {
  const q = { question_type: "multiple_choice", prompt: "Quels protocoles opèrent au niveau de la couche transport ? (plusieurs réponses)" };
  assert.equal(getRequiredAnswersCount(q), 2);
  const v0 = validateQuestionAnswers(q, []);
  assert.equal(v0.isSatisfied, false);
  assert.equal(v0.missing, 2);

  const v1 = validateQuestionAnswers(q, ["tcp"]);
  assert.equal(v1.isSatisfied, false);
  assert.equal(v1.missing, 1);

  const v2 = validateQuestionAnswers(q, ["tcp", "udp"]);
  assert.equal(v2.isSatisfied, true);
  assert.equal(v2.missing, 0);
});

test("Multiple choice questions parse explicit numerical requirements from prompt", () => {
  const q3 = { question_type: "multiple_choice", prompt: "Quelles sont les 3 mesures défensives recommandées par l'ANSSI ? (3 réponses attendues)" };
  assert.equal(getRequiredAnswersCount(q3), 3);
  assert.equal(validateQuestionAnswers(q3, ["a", "b"]).isSatisfied, false);
  assert.equal(validateQuestionAnswers(q3, ["a", "b", "c"]).isSatisfied, true);

  const qWord = { question_type: "multiple_choice", prompt: "Identifie les trois protocoles de routage dynamique parmi la liste suivante :" };
  assert.equal(getRequiredAnswersCount(qWord), 3);
});

test("Lab task order gate migration exists and checks question 1 prerequisite", () => {
  const migPath = path.join(__dirname, "..", "supabase", "migrations", "20261008000000_lab_task_order_gate.sql");
  assert.ok(fs.existsSync(migPath), "Migration 20261008000000_lab_task_order_gate.sql should exist");
  const content = fs.readFileSync(migPath, "utf-8");
  assert.ok(content.includes("submit_lab_task"), "Should define submit_lab_task");
  assert.ok(content.includes("min_task_pos"), "Should check min position (first question)");
  assert.ok(content.includes("lab_task_completions"), "Should verify completion of first task");
});
