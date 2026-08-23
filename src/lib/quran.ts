import type { HifzGrade } from "@prisma/client";

export const HIFZ_GRADE_LABELS: Record<HifzGrade, string> = {
  EXCELLENT: "ممتاز",
  GOOD: "جيد",
  AVERAGE: "متوسط",
  NEEDS_WORK: "يحتاج تحسين",
};

export const HIFZ_GRADE_COLORS: Record<HifzGrade, string> = {
  EXCELLENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  GOOD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  AVERAGE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  NEEDS_WORK: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

// Full classical تجويد rubric. Each scored 1-5.
// Grouped for the form layout.
export const TAJWEED_GROUPS: Array<{
  label: string;
  fields: Array<{ key: string; label: string; hint?: string }>;
}> = [
  {
    label: "أساسيات النطق",
    fields: [
      { key: "tajweedMakharij", label: "مخارج الحروف" },
      { key: "tajweedSifaat", label: "صفات الحروف" },
    ],
  },
  {
    label: "أحكام النون والميم الساكنة",
    fields: [
      { key: "tajweedNoonMeem", label: "أحكام النون الساكنة والتنوين", hint: "إظهار، إدغام، إقلاب، إخفاء" },
      { key: "tajweedMeemSakinah", label: "أحكام الميم الساكنة", hint: "إخفاء شفوي، إدغام شفوي، إظهار شفوي" },
    ],
  },
  {
    label: "المدود ولام التعريف",
    fields: [
      { key: "tajweedMudood", label: "أحكام المدود", hint: "طبيعي، متصل، منفصل، عارض، لازم" },
      { key: "tajweedLamTareef", label: "أحكام لام التعريف", hint: "شمسية / قمرية" },
    ],
  },
  {
    label: "القلقلة والتفخيم والترقيق",
    fields: [
      { key: "tajweedQalqala", label: "القلقلة", hint: "صغرى وكبرى" },
      { key: "tajweedTarqeeqTafkheem", label: "الترقيق والتفخيم" },
      { key: "tajweedRaa", label: "أحكام الراء" },
    ],
  },
  {
    label: "الوقف والإمالة والطلاقة",
    fields: [
      { key: "tajweedWaqf", label: "الوقف والابتداء" },
      { key: "tajweedImalah", label: "الإمالة والتسهيل والروم والإشمام" },
      { key: "tajweedFluency", label: "طلاقة التلاوة" },
    ],
  },
  {
    label: "التقييم العام",
    fields: [{ key: "tajweedOverall", label: "تقييم عام للتجويد" }],
  },
];

// Flat list (used for compact display in history cards)
export const TAJWEED_FIELDS = TAJWEED_GROUPS.flatMap((g) => g.fields);

export const SURAH_NAMES = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
  "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
  "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
  "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
  "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
  "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
  "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس",
];
