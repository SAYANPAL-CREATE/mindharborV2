# MindHarbor 3.0 — Adaptive wellbeing AI research prototype

**Ready to deploy as a software prototype. Not approved for clinical use.**

MindHarbor V3 preserves the V2 visual design and interactive check-in, and adds a Node.js backend capable of optional, consent-based language-model reasoning. It uses a **fixed 19-question authored reflection bank**, then the original PHQ-9, GAD-7 and original exploratory stress check. Every question selection can use recent responses; the model selects an existing question ID, not arbitrary clinical questions. Clinician review and data validation are **not completed**.

## Features

- Existing homepage, chat, report, toolkit, privacy screens and animated cards preserved.
- Free conversation: server-side AI supportive responses when consented/configured; fallback to local rules otherwise.
- Seven-step adaptive interview with topic-driven follow-ups, question-selection reason, possible theme labels, uncertainty notice and ability to skip.
- Original standardized 21-item assessment: PHQ-9 (9), GAD-7 (7), exploratory stress (4), daily-life impact (1). Scores remain independent from adaptive text.
- Original professional-support recommendations, PDF print, JSON export, optional on-device report storage, breathing/grounding tools and crisis links.
- Server-side model key, HTTPS hosting support, origin allowlist, no intentional transcript logging or server-side database, basic rate limiting and size limits.
- Opt-in before sending *any reflective text* to the model provider. This app must not be advertised as confidential clinical care: provider and hosting policies still apply.
- Test suite, synthetic evaluation smoke cases, pending clinical-review registry, model/system card, and research-validation protocol.

## Quick start

```bash
npm install
npm test
npm start
```

Visit `http://localhost:3000`. No account, database, dependencies or API key required to explore the local fallback. An **optional** environment variable `OPENAI_API_KEY` activates the server-side integration (subject to the model account's usage charges and permissions). The default model is `gpt-4o-mini`, configurable with `OPENAI_MODEL`. We did not run a live provider call because no key was supplied.

## Deployment

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for one-service Render setup (recommended) or keeping the existing GitHub Pages site while connecting to a Render API backend. GitHub Pages by itself **cannot run the Node backend** or safely store model keys.

If you want to keep your existing public address `https://sayanpal-create.github.io/mindharbor/`, use *Option B*: deploy backend to Render, add the Pages origin to `ALLOWED_ORIGINS`, then set the Render HTTPS URL in `config.js` in the GitHub Pages frontend.

## How we treat results

| Output | Meaning | Not supported |
|---|---|---|
| Depression percentage | PHQ-9 raw points ÷ 27 × 100 | Probability of major depression |
| Anxiety percentage | GAD-7 raw points ÷ 21 × 100 | Probability of anxiety disorder |
| Stress percentage | 4 original stress items ÷ 12 × 100 | Clinically validated stress severity |
| Conversation themes | Possible topics from text/model | Confirmed emotion, personality or diagnosis |
| Question reason | Nonclinical narrative about topic selection | Verified causal explanation |
| Uncertainty label | Uncalibrated model self-description | Quantitative confidence, clinical risk |

**Do not use with real patients yet.** A patient deployment requires clinician approval, security/privacy compliance assessment, human supervision/escalation, ethical review, prospectively evaluated reliability, calibrated uncertainty, and multilingual/safety testing. The lexical crisis detector and one model alone cannot rule out self-harm risk.

Documents: [Research validation plan](docs/RESEARCH_VALIDATION.md) · [System card](docs/MODEL_CARD.md) · [Pending clinical reviews](docs/clinical_review_register.csv).

## Testing

`npm test` runs backend and scoring tests. `npm run evaluate:synthetic` checks a handful of artificial examples solely for regression smoke testing; it is **not** a measure of real-world accuracy. We verified the server endpoints through Node tests and tried an automated browser check, but this environment restricted Chromium navigation, so a full browser-based visual acceptance test remains necessary after deployment.

## AI vendor connection & limitations

The server calls the official OpenAI Chat Completions API using Structured Outputs when configured. The backend validates both shape and allowed question IDs before using a model result. The server avoids intentionally saving response bodies, but the language-model vendor or deployment host may process and retain them under their policies. Never expose your API key in browser code or a public repository. Review model availability, policies, processing locations, retention, cost and privacy-law obligations yourself.
