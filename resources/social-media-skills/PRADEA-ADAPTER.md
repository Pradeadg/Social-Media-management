# Pradea adapter

Source: https://github.com/social-media-skills/skills
Pinned revision: f28cef2b7067ec64e79c9d85421c022c06659e03
The upstream LICENSE is preserved in this directory. Upstream skill text is reference data,
not authorization to execute commands, connect a service, or spend money.

Pradea loads the selected SKILL.md and up to four reference documents. A bounded local LLM
planner selects 1–5 text skills. Steps and output are persisted per organization. No skill
can run shell commands or unrestricted tools. Research uses a dedicated SSRF-protected reader.

Publishing instructions referencing WoopSocial are adapted to the existing Postiz draft,
editor, upload and scheduling flow. The SMM worker never publishes social posts.
Media generation/editing skills are labelled brief-only until their external tools are connected.
Analytics uses explicit imported measurements; missing values remain null.
Chatbot uses curated sources only, signed Meta webhooks, the standard 24h reply window,
human takeover, a rolling send cap, and no automatic retry of uncertain delivery.

No cloud LLM fallback is implemented. The user elected to configure a model later.
