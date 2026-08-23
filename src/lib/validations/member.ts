import { z } from "zod";

export const childMemberSchema = z.object({
  fullName: z.string().min(3, "الاسم الكامل مطلوب"),
  dateOfBirth: z.string().optional(),
  placeOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  parentCin: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  educationalLevel: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  subscriptionAmount: z.string().optional(),
  sections: z.array(z.enum(["EDUCATIONAL", "SOCIAL", "QURAN"])).min(1, "يجب اختيار قسم واحد على الأقل"),
});

export const adultMemberSchema = z.object({
  fullName: z.string().min(3, "الاسم الكامل مطلوب"),
  dateOfBirth: z.string().optional(),
  placeOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  cin: z.string().optional(),
  educationalLevel: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  profession: z.string().optional(),
  associationRole: z.string().optional(),
  subscriptionAmount: z.string().optional(),
  sections: z.array(z.enum(["EDUCATIONAL", "SOCIAL", "QURAN"])).default([]),
});

export type ChildMemberInput = z.infer<typeof childMemberSchema>;
export type AdultMemberInput = z.infer<typeof adultMemberSchema>;
