'use server';
/**
 * @fileOverview A Genkit flow for extracting critical information from Safety Data Sheets (SDS/MSDS).
 *
 * - aiMsdsDataExtraction - A function that handles the SDS data extraction process.
 * - AiMsdsDataExtractionInput - The input type for the aiMsdsDataExtraction function.
 * - AiMsdsDataExtractionOutput - The return type for the aiMsdsDataExtraction function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiMsdsDataExtractionInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A Safety Data Sheet (SDS/MSDS) document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Can be a PDF or an image." 
    ),
});
export type AiMsdsDataExtractionInput = z.infer<typeof AiMsdsDataExtractionInputSchema>;

const AiMsdsDataExtractionOutputSchema = z.object({
  productName: z.string().describe('The name of the product extracted from the SDS.').nullable(),
  casNumber: z.string().describe('The main CAS number of the product or primary hazardous substance.').nullable(),
  hStatements: z.array(z.string()).describe('A list of relevant H-statements from Section 2 of the SDS.').nullable(),
  ingredients: z.array(
    z.object({
      name: z.string().describe('The name of the ingredient.'),
      casNumber: z.string().describe('The CAS number of the ingredient.').nullable(),
    })
  ).describe('A list of ingredients from Section 3 of the SDS, including their names and CAS numbers.').nullable(),
  isNamedSubstance: z.boolean().describe("Indicates if the product or any main ingredient is a 'Named Substance' according to Seveso III Directive Annex I, Part 2."),
  namedSubstanceName: z.string().describe("The specific name of the 'Named Substance' if identified.").nullable(),
});
export type AiMsdsDataExtractionOutput = z.infer<typeof AiMsdsDataExtractionOutputSchema>;

export async function aiMsdsDataExtraction(input: AiMsdsDataExtractionInput): Promise<AiMsdsDataExtractionOutput> {
  return aiMsdsDataExtractionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiMsdsDataExtractionPrompt',
  model: 'gemini-1.5-flash-latest',
  input: { schema: AiMsdsDataExtractionInputSchema },
  output: { schema: AiMsdsDataExtractionOutputSchema },
  prompt: `You are an expert in chemical safety and Seveso III Directive (2012/18/EU), specifically Annex I, Part 2 for 'Named Substances'.
Your task is to analyze the provided Safety Data Sheet (SDS/MSDS) document and extract key information in JSON format.

Carefully read the document and identify the following:
1.  Product Name: The full name of the product.
2.  CAS Number: The main Chemical Abstracts Service (CAS) number of the product or its primary hazardous component. If multiple are present for the product, pick the most relevant one.
3.  H-statements: A list of all relevant H-statements found in Section 2 (Hazard identification).
4.  Ingredients: A list of ingredients from Section 3 (Composition/information on ingredients), including their names and CAS numbers if available. Format each ingredient as an object with 'name' and 'casNumber' fields.
5.  Named Substance Identification: Based on the extracted CAS number(s) and substance names, determine if the product or any of its main hazardous ingredients is a 'Named Substance' as defined in Annex I, Part 2 of the Seveso III Directive. Set 'isNamedSubstance' to true or false. If it is a named substance, identify its specific name and set 'namedSubstanceName' accordingly.

Strictly adhere to the following rules to prevent 'hallucinations':
-   Only extract information that is explicitly present in the document. Do not infer or guess.
-   If a piece of information (like productName, casNumber, hStatements, ingredients, namedSubstanceName) is not found, return null for single fields or an empty array for lists. Set 'isNamedSubstance' to false if no named substance is identified.
-   Use CAS numbers for a 100% certain identification of 'Named Substances'. For example, if "Natronloog" is mentioned, do not incorrectly match it as "Methanol".

Document: {{media url=documentDataUri}}
`,
});

const aiMsdsDataExtractionFlow = ai.defineFlow(
  {
    name: 'aiMsdsDataExtractionFlow',
    inputSchema: AiMsdsDataExtractionInputSchema,
    outputSchema: AiMsdsDataExtractionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
