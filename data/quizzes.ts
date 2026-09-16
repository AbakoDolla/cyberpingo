import { Quiz } from "@/types";

export const quizzes: Quiz[] = [
  {
    id: "q1",
    lessonId: "l1",
    title: "Quiz — Le fonctionnement du DNS",
    xpReward: 80,
    questions: [
      {
        id: "q1-1",
        type: "qcm",
        prompt: "À quoi sert principalement le DNS ?",
        options: [
          "Chiffrer le trafic réseau",
          "Traduire les noms de domaine en adresses IP",
          "Bloquer les pare-feux",
          "Compresser les fichiers",
        ],
        correctAnswer: "Traduire les noms de domaine en adresses IP",
        explanation:
          "Le DNS agit comme un annuaire : il convertit un nom de domaine lisible en une adresse IP utilisable par les machines.",
      },
      {
        id: "q1-2",
        type: "vrai_faux",
        prompt: "Le DNS spoofing consiste à rediriger un utilisateur vers un faux site.",
        options: ["Vrai", "Faux"],
        correctAnswer: "Vrai",
        explanation:
          "Le DNS spoofing falsifie les réponses DNS pour rediriger la victime vers un site malveillant qui imite le site légitime.",
      },
      {
        id: "q1-3",
        type: "qcm",
        prompt: "Quelle commande permet d'interroger un enregistrement DNS ?",
        options: ["ping", "dig", "chmod", "grep"],
        correctAnswer: "dig",
        explanation:
          "La commande dig interroge directement les serveurs DNS et affiche les enregistrements associés à un domaine.",
      },
    ],
  },
];
