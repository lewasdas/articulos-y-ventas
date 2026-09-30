const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const https = require("https");

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

// Markdown to basic HTML for WordPress
function markdownToHtml(md) {
  return md
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
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
    ? tagsMatch[1].split(",").map((t) => t.trim()).filter(Boolean)
    : ["AI", "Technology", "2026"];

  const content = raw
    .replace(/DESCRIPTION:.+/s, "")
    .replace(/TAGS:.+/s, "")
    .trim();

  return { content, description, tags };
}

async function publishToWordPress(topic, content, description, tags) {
  const wpUrl = process.env.WP_URL;
  const wpUser = process.env.WP_USER;
  const wpPassword = process.env.WP_APP_PASSWORD;

  if (!wpUrl || !wpUser || !wpPassword) {
    console.log("WordPress: skipped (no credentials)");
    return null;
  }

  const html = markdownToHtml(content);
  const credentials = Buffer.from(`${wpUser}:${wpPassword}`).toString("base64");

  const body = JSON.stringify({
    title: topic,
    content: html,
    excerpt: description,
    status: "publish",
    tags: tags,
  });

  return new Promise((resolve) => {
    const url = new URL(`${wpUrl}/wp-json/wp/v2/posts`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        const json = JSON.parse(data);
        if (json.link) {
          console.log("WordPress: published →", json.link);
          resolve(json.link);
        } else {
          console.log("WordPress error:", json.message);
          resolve(null);
        }
      });
    });
    req.write(body);
    req.end();
  });
}

async function getLinkedInAccessToken() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const refreshToken = process.env.LINKEDIN_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  }).toString();

  return new Promise((resolve) => {
    const options = {
      hostname: "www.linkedin.com",
      path: "/oauth/v2/accessToken",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        const json = JSON.parse(data);
        resolve(json.access_token || null);
      });
    });
    req.write(body);
    req.end();
  });
}

async function publishToLinkedIn(topic, description, wpLink) {
  if (!process.env.LINKEDIN_CLIENT_ID) {
    console.log("LinkedIn: skipped (no credentials)");
    return;
  }

  const accessToken = await getLinkedInAccessToken();
  if (!accessToken) {
    console.log("LinkedIn: failed to get access token");
    return;
  }

  // Get LinkedIn user URN
  const profileUrn = await new Promise((resolve) => {
    const options = {
      hostname: "api.linkedin.com",
      path: "/v2/userinfo",
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        const json = JSON.parse(data);
        resolve(json.sub ? `urn:li:person:${json.sub}` : null);
      });
    });
    req.end();
  });

  if (!profileUrn) {
    console.log("LinkedIn: could not get profile URN");
    return;
  }

  const articleUrl = wpLink || "https://aipulse.vercel.app";
  const postText = `🤖 New article: ${topic}\n\n${description}\n\nRead more 👇\n${articleUrl}\n\n#AI #Technology #ArtificialIntelligence #Tech2026`;

  const body = JSON.stringify({
    author: profileUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: postText },
        shareMediaCategory: "ARTICLE",
        media: [
          {
            status: "READY",
            originalUrl: articleUrl,
            title: { text: topic },
            description: { text: description },
          },
        ],
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  });

  return new Promise((resolve) => {
    const options = {
      hostname: "api.linkedin.com",
      path: "/v2/ugcPosts",
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "X-Restli-Protocol-Version": "2.0.0",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        if (res.statusCode === 201) {
          console.log("LinkedIn: post published ✓");
        } else {
          console.log("LinkedIn error:", data);
        }
        resolve();
      });
    });
    req.write(body);
    req.end();
  });
}

const ARTICLES_PER_DAY = parseInt(process.env.ARTICLES_PER_DAY || "10");

async function generateOne(index) {
  console.log(`\n[${index + 1}/${ARTICLES_PER_DAY}] Generating topic...`);
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
  const filePath = path.join(__dirname, "..", "content", "articles", `${slug}.md`);
  fs.writeFileSync(filePath, frontmatter + content, "utf8");
  console.log(`Saved: ${filePath}`);

  const wpLink = await publishToWordPress(topic, content, description, tags);
  await publishToLinkedIn(topic, description, wpLink);
}

async function main() {
  console.log(`Starting: ${ARTICLES_PER_DAY} articles today`);

  for (let i = 0; i < ARTICLES_PER_DAY; i++) {
    await generateOne(i);
  }

  console.log(`\nDone! ${ARTICLES_PER_DAY} articles published.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
