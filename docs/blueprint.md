# **App Name**: Seveso Expert Threshold Checker

## Core Features:

- AI-Powered MSDS Analysis (Bulk Scan): Automatically extract data from Safety Data Sheets (SDS/MSDS) PDFs or images, identifying product name, CAS number, relevant H-statements, and ingredients, preventing 'hallucinations' by using CAS numbers for matching with 'Named Substances' from Annex I, Part 2.
- Seveso Classification & Mapping: Classify substances according to official hazard categories, including Health Hazards (H1-H3), Physical Hazards (P1-P8), Environmental Hazards (E1-E2), Other Hazards (O1-O3), and Named Substances (N).
- Automatic Summation Calculation: Calculate in real-time whether the facility exceeds the legal thresholds, using the correct summation rules where groups (Health, Physical, Environment) are evaluated separately; supports specific classifications such as P5c.
- Dashboard Overview: Provide a dashboard that stays in view, giving a direct overview with group meters, a mode switch to toggle between 'Low' and 'High' thresholds, and a status determiner showing the most critical hazard group and the ultimate Seveso conclusion.
- Inventory Table Visualization: Display each substance with 'Contribution-cards' showing how much a substance consumes of the threshold value. Allows manual adjustment of stock (in tons).
- Detailed Audit Trail: Upon request by the user, explain how the AI tool classified a specific substance. Display the exact H-phrase that triggered the classification.
- Data Export and Reporting: Generate .xlsx reports containing inventories and a report tab, while also allowing for loading previous files back into the app and including a print function to convert the interface to a landscape format, suitable for official reports.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to inspire trust and convey expertise.
- Background color: Very light blue (#E8EAF6), a desaturated variant of the primary, for a calm and professional feel.
- Accent color: Analogous color of a slightly violet hue (#5C6BC0), slightly lighter than the primary to bring visual interest without stealing focus.
- Body and headline font: 'Inter' for a modern, objective, neutral feel.
- Use clear and professional icons representing different hazard categories.
- Dashboard always visible on the right side of the screen for an efficient workflow.
- Subtle transitions and animations to provide feedback and improve user experience.