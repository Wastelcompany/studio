'use server';
/**
 * @fileOverview A Genkit flow for searching company details via KVK (simulated via AI).
 *
 * - kvkSearch - A function that handles the KVK data lookup process.
 * - KvkSearchInput - The input type for the kvkSearch function.
 * - KvkSearchOutput - The return type for the kvkSearch function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const KvkSearchInputSchema = z.object({
  query: z.string().describe('A KVK number (8 digits) or a company name to search for.'),
});
export type KvkSearchInput = z.infer<typeof KvkSearchInputSchema>;

const KvkSearchOutputSchema = z.object({
  results: z.array(
    z.object({
      name: z.string().describe('The official registered name of the company.'),
      address: z.string().describe('The full registered address of the company.'),
      kvkNumber: z.string().describe('The 8-digit KVK registration number.'),
      city: z.string().describe('The city where the company is registered.'),
    })
  ).describe('A list of matching companies found in the (simulated) KVK registry.'),
});
export type KvkSearchOutput = z.infer<typeof KvkSearchOutputSchema>;

export async function kvkSearch(input: KvkSearchInput): Promise<KvkSearchOutput> {
  return kvkSearchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'kvkSearchPrompt',
  model: 'googleai/gemini-2.5-flash-lite',
  input: { schema: KvkSearchInputSchema },
  output: { schema: KvkSearchOutputSchema },
  prompt: `You are a specialist in the Dutch Chamber of Commerce (Kamer van Koophandel - KVK) registry.
Your task is to provide realistic company information based on a search query.

Input query: "{{{query}}}"

Instructions:
1. If the query is an 8-digit number, treat it as a KVK number.
2. If the query is a name, search for realistic companies with that name in the Netherlands.
3. Provide the official name, full address (street, number, zip, city), the KVK number, and the city.
4. If you don't find a specific real company, generate a highly realistic example that fits the query.
5. Return at least 1 and at most 3 results.

Return only valid JSON.`,
});

const kvkSearchFlow = ai.defineFlow(
  {
    name: 'kvkSearchFlow',
    inputSchema: KvkSearchInputSchema,
    outputSchema: KvkSearchOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
