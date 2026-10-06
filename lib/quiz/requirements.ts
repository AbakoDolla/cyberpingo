/**
 * CyberPingo · Quiz & Lab Answer Requirements Gate
 *
 * Rules:
 * 1. For single_choice and true_false: exactly 1 response is expected.
 * 2. For multiple_choice questions in quizzes or certification exams:
 *    - By pedagogical definition, multiple-choice questions require at least 2 answers.
 *    - If the prompt specifies a higher explicit count (e.g. "(3 réponses attendues)", "(3 choix)"),
 *      that count is parsed and enforced.
 *    - Learners must select AT LEAST the required count before they are permitted to proceed or submit.
 * 3. For hands-on labs:
 *    - The learner must solve question 1 (task 1) before unlocking subsequent tasks/questions.
 */

export function getRequiredAnswersCount(question: {
  question_type: string;
  prompt?: string;
  answers?: Array<unknown>;
  options?: Array<unknown>;
}): number {
  if (question.question_type === "single_choice" || question.question_type === "true_false") {
    return 1;
  }

  if (question.question_type === "multiple_choice") {
    const prompt = question.prompt || "";

    // 1. Check for explicit numeric indicators: e.g. "(3 réponses)", "(2 réponses attendues)", "(3 choix)", "sélectionne 3"
    const numMatch =
      prompt.match(/(?:\(|\b)(\d+)\s*(?:réponses?|answers?|choix|options?)/i) ||
      prompt.match(/(?:sélectionne|choisis|choisir|select|choose|cocher?)\s+(\d+)/i);

    if (numMatch && numMatch[1]) {
      const parsed = parseInt(numMatch[1], 10);
      if (parsed >= 2) return parsed;
    }

    // 2. Check for written words in French and English
    if (/(?:deux|two)\s+(?:réponses?|answers?|choix|options?)/i.test(prompt)) return 2;
    if (/(?:trois|three)\s+(?:réponses?|answers?|choix|options?)/i.test(prompt)) return 3;
    if (/(?:quatre|four)\s+(?:réponses?|answers?|choix|options?)/i.test(prompt)) return 4;

    // 3. By definition, multiple choice ("plusieurs réponses") strictly requires at least 2 answers
    return 2;
  }

  return 1;
}

export interface QuestionValidationStatus {
  required: number;
  selected: number;
  isSatisfied: boolean;
  missing: number;
  label: string;
}

export function validateQuestionAnswers(
  question: { question_type: string; prompt?: string },
  selectedAnswers: string[] = []
): QuestionValidationStatus {
  const required = getRequiredAnswersCount(question);
  const selected = selectedAnswers.length;
  const isSatisfied = selected >= required;
  const missing = Math.max(0, required - selected);

  let label: string;
  if (question.question_type === "multiple_choice") {
    if (isSatisfied) {
      label = `✓ ${selected} sélectionnée${selected > 1 ? "s" : ""} (requis : ${required})`;
    } else {
      label = `${selected} / ${required} requise${required > 1 ? "s" : ""} (encore ${missing} nécessaire${missing > 1 ? "s" : ""})`;
    }
  } else {
    label = isSatisfied ? "✓ Sélectionnée" : "1 réponse requise";
  }

  return {
    required,
    selected,
    isSatisfied,
    missing,
    label,
  };
}
