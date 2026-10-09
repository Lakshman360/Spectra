# SPECTRA — See Beyond the Scores

A responsive Academic Performance & Early Warning System prototype built with React, TypeScript, Vite, Recharts and Lucide icons.

## Features
- Academic overview with cohort KPIs and charts
- Student directory with search and risk filters
- Explainable SPECTRA Signals showing evidence behind each risk flag
- Learning Pathway with subject-level gaps and recommended next steps
- Action Tracker to record faculty interventions
- What-if simulator to explore how improved attendance or marks may affect a student's signal
- Demo data and browser `localStorage` persistence for intervention updates

> This is a hackathon prototype using synthetic demonstration data and a transparent rule-based score. It is not a validated predictive model and should support—not replace—faculty judgement.

## Run locally
Install Node.js LTS from https://nodejs.org/en/download first.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually http://localhost:5173).

## Build
```bash
npm run build
npm run preview
```

## Deploy to GitHub + Vercel
1. Create a new empty repository on GitHub.
2. Extract this ZIP and open the `SPECTRA` folder in VS Code.
3. In the VS Code terminal run:
   ```bash
   npm install
   npm run dev
   ```
4. When ready, run:
   ```bash
   git init
   git add .
   git commit -m "Initial SPECTRA prototype"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```
   Replace the URL with your repository's actual URL.
5. On Vercel, choose **Add New → Project**, import the GitHub repository, and deploy. Vercel detects Vite automatically. Build command: `npm run build`; output directory: `dist`.

## Project structure
```
src/
  App.tsx
  main.tsx
  styles.css
```
