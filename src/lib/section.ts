import type { Section } from "@prisma/client";

export const SECTION_LABELS: Record<Section, string> = {
  EDUCATIONAL: "القسم التربوي",
  SOCIAL: "القسم الاجتماعي",
  QURAN: "قسم القرآن الكريم",
  QUDAT: "مركز تأهيل القادة",
  MEDIA: "القسم الإعلامي",
};

export const SECTION_FROM_PATH: Record<string, Section> = {
  educational: "EDUCATIONAL",
  social: "SOCIAL",
  quran: "QURAN",
  qada: "QUDAT",
  media: "MEDIA",
};
