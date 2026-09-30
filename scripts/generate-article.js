const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

async function generateTopic() {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Generate ONE specific, trending article topic about AI tools or technology for 2026.
It must be:
- Practical and useful for readers
- Something people actively search on Google
- Not too broad, not too narrow
- In English

Reply with ONLY the topic title, nothing else. No quotes, no explanation.`,
      },
    ],
  });

  return msg.content[0].text.trim();
}

async function generateArticle(topic) {
  const today = formatDate(new Date());

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Write a complete, high-quality blog article about: "${topic}"

Requirements:
- Length: 800-1200 words
- Format: Markdown with H2 and H3 headings
- Include: practical tips, real examples, actionable advice
- SEO optimized: use the main keyword naturally throughout
- Engaging intro that hooks the reader
- Clear conclusion with a call to action
- Written in English, professional but accessible tone
- Do NOT include the title (H1) in the content, it will be added from frontmatter

Also provide at the very end, after the article, on a new line:
DESCRIPTION: [one sentence SEO meta description, max 155 chars]
TAGS: [tag1, tag2, tag3, tag4]`,
      },
    ],
  });

  const raw = msg.content[0].text;

  const descMatch = raw.match(/DESCRIPTION:\s*(.+)/);
  const tagsMatch = raw.match(/TAGS:\s*(.+)/);

  const description = descMatch
    ? descMatch[1].trim()
    : `Learn everything about ${topic} in this comprehensive guide.`;

  const tags = tagsMatch
    ? tagsMatch[1]
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : ["AI", "Technology", "2026"];

  const content = raw
    .replace(/DESCRIPTION:.+/s, "")
    .replace(/TAGS:.+/s, "")
    .trim();

  return { content, description, tags };
}

async function main() {
  console.log("Generating topic...");
  const topic = await generateTopic();
  console.log(`Topic: ${topic}`);

  console.log("Generating article...");
  const { content, description, tags } = await generateArticle(topic);

  const slug = slugify(topic);
  const date = formatDate(new Date());

  const frontmatter = `---
title: "${topic}"
date: "${date}"
description: "${description}"
tags: [${tags.map((t) => `"${t}"`).join(", ")}]
slug: "${slug}"
---

`;

  const fullArticle = frontmatter + content;
  const filePath = path.join(
    __dirname,
    "..",
    "content",
    "articles",
    `${slug}.md`
  );

  fs.writeFileSync(filePath, fullArticle, "utf8");
  console.log(`Article saved: ${filePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
