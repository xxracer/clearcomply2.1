
'use server';

/**
 * @fileOverview An AI agent that generates a form structure based on a series of structured options.
 *
 * - generateFormFromOptions - A function that handles the form generation process.
 * - GenerateFormOptionsInput - The input type for the generateFormFromOptions function.
 * - GenerateFormOptionsOutput - The return type for the generateFormFromOptions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFormOptionsInputSchema = z.object({
  formPurpose: z.string().describe("A brief description of the form's purpose (e.g., 'Delivery Driver Application')."),
  companyName: z.string().optional().describe("The name of the company for which the form is being created."),
  includeLogo: z.boolean().describe("Whether to include a space for a company logo."),
  personalInfo: z.array(z.string()).describe("A list of essential personal information fields to include."),
  includeReferences: z.boolean().describe("Whether to include a section for personal or professional references."),
  includeEducation: z.boolean().describe("Whether to include a section for educational history."),
  includeEmploymentHistory: z.boolean().describe("Whether to include a section for previous employment history."),
  includeCredentials: z.boolean().describe("Whether to include a section for special credentials, licenses, or skills."),
});
export type GenerateFormOptionsInput = z.infer<typeof GenerateFormOptionsInputSchema>;


const FormFieldSchema = z.object({
    id: z.string().describe("A unique machine-readable ID for the field (e.g., 'firstName', 'yearsOfExperience')."),
    label: z.string().describe("The human-readable label for the form field (e.g., 'First Name')."),
    type: z.enum(['text', 'number', 'date', 'email', 'phone', 'textarea', 'select', 'checkbox']).describe("The type of input for the field."),
    options: z.array(z.string()).optional().describe("For 'select' type, a list of possible options."),
    required: z.boolean().describe("Whether the field is mandatory."),
});

const GenerateFormOptionsOutputSchema = z.object({
  formName: z.string().describe("A suitable name for the generated form (e.g., 'Delivery Driver Application Form')."),
  fields: z.array(FormFieldSchema).describe("An array of objects, where each object represents a field in the form.")
});
export type GenerateFormOptionsOutput = z.infer<typeof GenerateFormOptionsOutputSchema>;


export async function generateFormFromOptions(input: GenerateFormOptionsInput): Promise<GenerateFormOptionsOutput> {
  return generateFormFromOptionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFormFromOptionsPrompt',
  input: {schema: GenerateFormOptionsInputSchema},
  output: {schema: GenerateFormOptionsOutputSchema},
  prompt: `You are an expert form designer. Based on the user's structured requirements, generate a complete and logical form.

  User's requirements for the form:
  - Purpose of the form: "{{{formPurpose}}}"
  {{#if companyName}}- For company: "{{{companyName}}}"{{/if}}
  {{#if includeLogo}}- The form should have a designated area for a company logo.{{/if}}

  Sections to include:
  - Personal Information: The user has specified the following fields are essential: {{#each personalInfo}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}. Please include these and any other logical personal info fields.
  {{#if includeEducation}}- Education History: A section to detail the applicant's educational background (e.g., high school, college).{{/if}}
  {{#if includeEmploymentHistory}}- Employment History: A section to list previous jobs, including dates, responsibilities, and reason for leaving.{{/if}}
  {{#if includeReferences}}- References: A section for personal or professional references.{{/if}}
  {{#if includeCredentials}}- Credentials and Skills: A section for licenses, certifications, or other specialized skills.{{/if}}

  Based on these requirements, generate a structured form. The 'formName' should be descriptive and based on the purpose. For each field, provide a unique ID, a label, an appropriate input type, and whether it is required.
  For fields that should have a predefined set of choices, use the 'select' type and provide the options.`,
});

const generateFormFromOptionsFlow = ai.defineFlow(
  {
    name: 'generateFormFromOptionsFlow',
    inputSchema: GenerateFormOptionsInputSchema,
    outputSchema: GenerateFormOptionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
