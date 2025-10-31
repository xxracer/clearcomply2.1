
'use server';

/**
 * @fileOverview An AI agent that generates a form structure based on a user's prompt.
 *
 * - generateForm - A function that handles the form generation process.
 * - GenerateFormInput - The input type for the generateForm function.
 * - GenerateFormOutput - The return type for the generateForm function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFormInputSchema = z.object({
  prompt: z
    .string()
    .describe('A natural language description of the form to be generated.'),
});
export type GenerateFormInput = z.infer<typeof GenerateFormInputSchema>;


const FormFieldSchema = z.object({
    id: z.string().describe("A unique machine-readable ID for the field (e.g., 'firstName', 'yearsOfExperience')."),
    label: z.string().describe("The human-readable label for the form field (e.g., 'First Name')."),
    type: z.enum(['text', 'number', 'date', 'email', 'phone', 'textarea', 'select', 'checkbox']).describe("The type of input for the field."),
    options: z.array(z.string()).optional().describe("For 'select' type, a list of possible options."),
    required: z.boolean().describe("Whether the field is mandatory."),
});

const GenerateFormOutputSchema = z.object({
  formName: z.string().describe("A suitable name for the generated form (e.g., 'Delivery Driver Application')."),
  fields: z.array(FormFieldSchema).describe("An array of objects, where each object represents a field in the form.")
});
export type GenerateFormOutput = z.infer<typeof GenerateFormOutputSchema>;


export async function generateForm(input: GenerateFormInput): Promise<GenerateFormOutput> {
  return generateFormFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFormPrompt',
  input: {schema: GenerateFormInputSchema},
  output: {schema: GenerateFormOutputSchema},
  prompt: `You are an expert form designer. Based on the user's prompt, generate a structured form with appropriate fields.

  User Prompt: "{{{prompt}}}"

  Generate a list of fields for this form. For each field, provide a unique ID, a label, an appropriate input type, and whether it is required.
  For fields that should have a predefined set of choices, use the 'select' type and provide the options.
  Also, provide a suitable name for the overall form.`,
});

const generateFormFlow = ai.defineFlow(
  {
    name: 'generateFormFlow',
    inputSchema: GenerateFormInputSchema,
    outputSchema: GenerateFormOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
