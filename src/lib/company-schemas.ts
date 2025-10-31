
import { z } from "zod";

export const requiredDocSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['digital', 'upload']),
});
export type RequiredDoc = z.infer<typeof requiredDocSchema>;

// Represents the configuration for a single application form (Phase 1)
const applicationFormSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['template', 'custom']).default('template'),
  images: z.array(z.string()).optional(), // URLs/keys to images in Vercel Blob/KV
});
export type ApplicationForm = z.infer<typeof applicationFormSchema>;

// Represents a complete, reusable onboarding process
export const onboardingProcessSchema = z.object({
    id: z.string(),
    name: z.string(),
    // Phase 1 settings
    applicationForm: applicationFormSchema.optional(),
    // Phase 2 settings
    interviewScreen: z.object({
        type: z.enum(['template', 'custom']).default('template'),
        imageUrl: z.string().nullable().optional(),
    }).optional(),
    // Phase 3 settings
    requiredDocs: z.array(requiredDocSchema).optional().default([]),
});
export type OnboardingProcess = z.infer<typeof onboardingProcessSchema>;


export const companySchema = z.object({
  id: z.string().optional(),
  created_at: z.string().optional(),
  name: z.string().min(1, "Company name is required"),
  logo: z.string().nullable().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  
  // A company can have multiple onboarding processes
  onboardingProcesses: z.array(onboardingProcessSchema).optional().default([]),

  // These are now legacy and will be migrated to the new structure.
  // For backward compatibility, we'll keep them but mark as optional/any.
  formCustomization: z.any().optional(),
  phase1Images: z.any().optional(),
  interviewImage: z.any().optional(),
  // requiredDocs is now per-process, but we keep it for backward compatibility
  requiredDocs: z.any().optional(),
});

export type Company = z.infer<typeof companySchema>;
