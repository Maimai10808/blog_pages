const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const OWNER = "Maimai10808";
const REPO = "blog_pages";
const BRANCH = "main";

const ROOT_DIR = process.cwd();
const BLOG_DIR = path.join(ROOT_DIR, "blog");
const README_PATH = path.join(ROOT_DIR, "README.md");
const BLOG_README_PATH = path.join(BLOG_DIR, "README.md");
const FEED_JSON_PATH = path.join(ROOT_DIR, "blog-feed.json");

const BLOG_GITHUB_BASE_URL = `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/blog`;

const START = "<!-- BLOG-POST-LIST:START -->";
const END = "<!-- BLOG-POST-LIST:END -->";

const MAX_README_POSTS = 6;

function walkMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Blog directory not found: ${dir}`);
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walkMarkdownFiles(fullPath);
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      entry.name.toLowerCase() !== "readme.md"
    ) {
      return [fullPath];
    }

    return [];
  });
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const frontmatter = {};

  match[1].split(/\r?\n/).forEach((line) => {
    const result = line.match(/^([\w-]+):\s*(.*)$/);
    if (!result) return;

    const key = result[1].trim();
    const value = result[2].trim().replace(/^["']|["']$/g, "");
    frontmatter[key] = value;
  });

  return frontmatter;
}

function getTitle(content, fileName, frontmatter) {
  if (frontmatter.title) return frontmatter.title;

  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();

  return fileName
    .replace(/\.md$/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getDescription(content, frontmatter) {
  if (frontmatter.description) return frontmatter.description;
  if (frontmatter.summary) return frontmatter.summary;

  const withoutFrontmatter = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");

  const paragraph = withoutFrontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("```"));

  return paragraph ? paragraph.slice(0, 160) : "";
}

function getDate(filePath, frontmatter) {
  if (frontmatter.date) return frontmatter.date.slice(0, 10);
  if (frontmatter.created) return frontmatter.created.slice(0, 10);
  if (frontmatter.updated) return frontmatter.updated.slice(0, 10);

  const stats = fs.statSync(filePath);
  return stats.mtime.toISOString().slice(0, 10);
}

function getGitLastUpdatedAt(filePath) {
  try {
    const timestamp = execSync(`git log -1 --format=%cI -- "${filePath}"`, {
      encoding: "utf8",
    }).trim();

    if (timestamp) {
      return timestamp;
    }
  } catch (error) {
    console.warn(`Cannot get git updated time for ${filePath}`);
  }

  return null;
}

function getCategory(relativePath) {
  return relativePath.split("/")[0] || "uncategorized";
}

function collectPosts() {
  const files = walkMarkdownFiles(BLOG_DIR);

  return files
    .map((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      const frontmatter = parseFrontmatter(content);

      const relativePath = path
        .relative(BLOG_DIR, filePath)
        .replace(/\\/g, "/");

      const fileName = path.basename(filePath);
      const category = getCategory(relativePath);

      const gitUpdatedAt = getGitLastUpdatedAt(filePath);
      const date = gitUpdatedAt
        ? gitUpdatedAt.slice(0, 10)
        : getDate(filePath, frontmatter);

      return {
        title: getTitle(content, fileName, frontmatter),
        description: getDescription(content, frontmatter),
        date,
        updatedAt: gitUpdatedAt || `${date}T00:00:00.000Z`,
        category,
        githubUrl: `${BLOG_GITHUB_BASE_URL}/${relativePath}`,
        path: `blog/${relativePath}`,
      };
    })
    .sort((a, b) => {
      const updatedDiff = new Date(b.updatedAt) - new Date(a.updatedAt);

      if (updatedDiff !== 0) {
        return updatedDiff;
      }

      return a.title.localeCompare(b.title);
    });
}

function updateRootReadme(posts) {
  if (!fs.existsSync(README_PATH)) {
    console.warn("README.md not found, skipped.");
    return;
  }

  const readme = fs.readFileSync(README_PATH, "utf8");

  if (!readme.includes(START) || !readme.includes(END)) {
    console.warn("README markers not found, skipped README update.");
    return;
  }

  const list = posts
    .slice(0, MAX_README_POSTS)
    .map((post) => {
      return `- [${post.title}](${post.githubUrl}) · \`${post.category}\` · ${post.date}`;
    })
    .join("\n");

  const updated = readme.replace(
    new RegExp(`${START}[\\s\\S]*?${END}`),
    `${START}\n${list}\n${END}`,
  );

  fs.writeFileSync(README_PATH, updated);
}

function generateBlogReadme(posts) {
  const grouped = posts.reduce((acc, post) => {
    if (!acc[post.category]) acc[post.category] = [];
    acc[post.category].push(post);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  const content = [
    "# Blog Index",
    "",
    "> This file is automatically generated. Do not edit it manually.",
    "",
    `Total posts: **${posts.length}**`,
    "",
    "## Latest Posts",
    "",
    ...posts.slice(0, 10).map((post) => {
      return `- [${post.title}](${post.githubUrl}) · \`${post.category}\` · ${post.date}`;
    }),
    "",
    "## Categories",
    "",
    ...categories.flatMap((category) => {
      return [
        "<details>",
        `<summary><strong>${category}</strong> (${grouped[category].length})</summary>`,
        "",
        ...grouped[category].map((post) => {
          return `- [${post.title}](${post.githubUrl}) · ${post.date}`;
        }),
        "",
        "</details>",
        "",
      ];
    }),
  ].join("\n");

  fs.writeFileSync(BLOG_README_PATH, content);
}

function generateJsonFeed(posts) {
  const feed = {
    title: "Maimai Blog",
    description: "Frontend, Next.js, Web3, and on-chain development writings.",
    updatedAt: new Date().toISOString(),
    total: posts.length,
    posts,
  };

  fs.writeFileSync(FEED_JSON_PATH, JSON.stringify(feed, null, 2));
}

function main() {
  const posts = collectPosts();

  updateRootReadme(posts);
  generateBlogReadme(posts);
  generateJsonFeed(posts);

  console.log(`Synced ${posts.length} blog posts successfully.`);
}

main();
