# Bible Study Buddy

**Legacy project name:** Holy Bible GPT.

Bible Study Buddy is a modernized Christian Bible study assistant that combines chat-based study, verse reflection workflows, devotionals, prayer notes, and saved verses in one clean app.

## Features
- Bible Chat with suggested prompts and response states.
- Verse Study workflow (explanation, context, application, prayer, related verses).
- Devotional section (topic, verse, reflection, prayer, action step).
- Prayer Notes (add/edit/delete with local persistence).
- Saved Verses (save/remove with local persistence).
- Core theological guardrails in `src/lib/bibleAssistantGuidelines.ts`.

## Tech Stack
- React + TypeScript
- Vite
- Local storage persistence for notes/verses

## Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```
3. Add your keys (if using external AI or billing endpoints).
4. Start development server:
   ```bash
   npm run dev
   ```

## Build
```bash
npm run build
```

## Environment Variables
- `GEMINI_API_KEY`: AI provider key (never hard-code keys).
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: optional billing support.

## Google Play Store Notes
This repository is currently a **web Vite app**, not an Expo/React Native project. No Android manifest, Gradle, or Play-specific package files were found in this repo. For Play Store deployment, create a mobile client (Expo recommended) that consumes the same backend/API contracts and reuses this app’s brand/design/theology guardrails.

## Branding
- Public brand: **Bible Study Buddy**
- Historical/internal legacy reference: **Holy Bible GPT**
