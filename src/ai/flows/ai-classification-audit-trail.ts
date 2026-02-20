'use server';
/**
 * @fileOverview Provides a Genkit flow to explain the AI's classification of a substance into a Seveso category.
 *
 * - getAiClassificationAuditTrail - A function that requests an explanation for a substance's Seveso classification.
 * - AiClassificationAuditTrailInput - The input type for the getAiClassificationAuditTrail function.
 * - AiClassificationAuditTrailOutput - The return type for the getAiClassificationAuditTrail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiClassificationAuditTrailInputSchema = z.object({
  substanceName: z.string().describe('The name of the chemical substance.'),
  casNumber: z.string().optional().describe('The CAS number of the substance, if available.'),
  hPhrases: z.array(z.string()).describe('A list of H-phrases associated with the substance.'),
  assignedSevesoCategory: z.string().describe('The Seveso category that the substance was classified into (e.g., H1, P5c, E1).'),
  classificationContext: z.string().optional().describe('Additional context or rules that were used for classification, if any, to aid explanation.'),
});
export type AiClassificationAuditTrailInput = z.infer<typeof AiClassificationAuditTrailInputSchema>;

const AiClassificationAuditTrailOutputSchema = z.object({
  explanation: z.string().describe("A detailed explanation of why the substance was classified into the given Seveso category, referencing specific H-phrases."),
  triggeringHPhrases: z.array(z.string()).describe('The specific H-phrases from the input that directly led to the Seveso classification.'),
});
export type AiClassificationAuditTrailOutput = z.infer<typeof AiClassificationAuditTrailOutputSchema>;

export async function getAiClassificationAuditTrail(input: AiClassificationAuditTrailInput): Promise<AiClassificationAuditTrailOutput> {
  return aiClassificationAuditTrailFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiClassificationAuditTrailPrompt',
  model: 'gemini-1.5-flash',
  input: { schema: AiClassificationAuditTrailInputSchema },
  output: { schema: AiClassificationAuditTrailOutputSchema },
  prompt: `You are an expert in Seveso III Directive (2012/18/EU) classification. Your task is to provide a clear and concise explanation for why a given chemical substance was classified into a specific Seveso category, based on its H-phrases.

Substance Name: {{{substanceName}}}
{{#if casNumber}}CAS Number: {{{casNumber}}}{{/if}}
Assigned Seveso Category: {{{assignedSevesoCategory}}}
H-phrases:
{{#each hPhrases}}- {{{this}}}
{{/each}}
{{#if classificationContext}}Additional Classification Context: {{{classificationContext}}}{{/if}}

Please explain the classification by:
1. Stating the Seveso category and what it signifies.
2. Explaining which of the provided H-phrases specifically trigger or contribute to this classification according to Seveso III guidelines.
3. Identifying the exact H-phrases from the list that were the primary triggers.

Ensure your explanation is accurate and directly references the provided H-phrases.`,
});

const aiClassificationAuditTrailFlow = ai.defineFlow(
  {
    name: 'aiClassificationAuditTrailFlow',
    inputSchema: AiClassificationAuditTrailInputSchema,
    outputSchema: AiClassificationAuditTrailOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
