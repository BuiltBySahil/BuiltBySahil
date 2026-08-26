#!/usr/bin/env node
/**
 * Generates an animated SVG that looks like a "Space Invaders" rocket
 * clearing your GitHub contribution graph — busiest days destroyed first.
 *
 * Usage:
 *   GITHUB_TOKEN=xxxx GITHUB_LOGIN=BuiltBySahil node scripts/generate-rocket-game.mjs
 *
 * Output: game/contribution-rocket.svg
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// ---------- CONFIG (tweak freely) ----------
const CELL = 11; // px size of each day cell
const GAP = 4; // px gap between cells
const MARGIN = 20; // px outer margin
const ROCKET_LANE = 46; // px space below the grid for the rocket to fly in
const HIT_STEP_MS = 260; // time between each cell being destroyed
const END_PAUSE_MS = 2200; // pause once the board is fully cleared
const FLASH_MS = 180; // how long the muzzle-flash dot stays visible

const COLORS = {
  bg: "#0d1117",
  empty: "#f2f2f2", // "no contribution" cell (white, per your video)
  levels: ["#f2f2f2", "#9be9a8", "#40c463", "#30a14e", "#216e39"], // 0..4
  destroyed: "#0d1117", // cell colour once the rocket clears it (= bg, "gone")
  rocketBody: "#3b82f6",
  rocketBelly: "#f0f0f0",
  rocketFlame: "#f59e0b",
  flash: "#ffe066",
};

// ---------- 1. Fetch contribution data ----------
async function fetchContributions(login, token) {
  const query = `
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
                date
                weekday
              }
            }
          }
        }
      }
    }
  `;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { login } }),
  });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error("GraphQL error: " + JSON.stringify(json.errors));
  }
  return json.data.user.contributionsCollection.contributionCalendar.weeks;
}

// Level bucketing (roughly matches GitHub's own quartile look)
function levelFor(count, max) {
  if (count === 0) return 0;
  if (max <= 4) return Math.min(4, count);
  const q = max / 4;
  if (count <= q) return 1;
  if (count <= q * 2) return 2;
  if (count <= q * 3) return 3;
  return 4;
}

// ---------- 2. Build the SVG ----------
export function buildSVG(weeks) {
  const cols = weeks.length;
  const rows = 7;
  const gridW = cols * (CELL + GAP) - GAP;
  const gridH = rows * (CELL + GAP) - GAP;
  const width = gridW + MARGIN * 2;
  const height = gridH + MARGIN * 2 + ROCKET_LANE;

  // Flatten cells
  const cells = [];
  let maxCount = 0;
  weeks.forEach((week, w) => {
    week.contributionDays.forEach((day) => {
      maxCount = Math.max(maxCount, day.contributionCount);
      cells.push({
        week: w,
        weekday: day.weekday,
        count: day.contributionCount,
        date: day.date,
      });
    });
  });

  cells.forEach((c) => {
    c.level = levelFor(c.count, maxCount);
    c.x = MARGIN + c.week * (CELL + GAP);
    c.y = MARGIN + c.weekday * (CELL + GAP);
    c.cx = c.x + CELL / 2;
    c.cy = c.y + CELL / 2;
  });

  // Order of destruction: highest contribution count first.
  // Ties broken by date so the sweep still looks intentional.
  const targets = cells
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.date.localeCompare(b.date));

  const rocketY = MARGIN + gridH + ROCKET_LANE / 2;

  const hitDurationMs = targets.length * HIT_STEP_MS;
  const totalMs = hitDurationMs + END_PAUSE_MS;
  const dur = (totalMs / 1000).toFixed(2) + "s";

  const frac = (ms) => (ms / totalMs).toFixed(6);

  // ----- static (non-target) cells -----
  let cellRects = "";
  for (const c of cells) {
    if (c.count > 0) continue; // targets are drawn separately (they animate)
    cellRects += `<rect x="${c.x}" y="${c.y}" width="${CELL}" height="${CELL}" rx="2" fill="${COLORS.empty}"/>\n`;
  }

  // ----- animated target cells + flashes -----
  let targetRects = "";
  let flashes = "";
  targets.forEach((c, i) => {
    const hitMs = i * HIT_STEP_MS;
    const hitFrac = frac(hitMs);
    const original = COLORS.levels[c.level];
    targetRects += `<rect x="${c.x}" y="${c.y}" width="${CELL}" height="${CELL}" rx="2" fill="${original}">
      <animate attributeName="fill" calcMode="discrete" dur="${dur}" repeatCount="indefinite"
        values="${original};${COLORS.destroyed}" keyTimes="0;${hitFrac}"/>
    </rect>\n`;

    const flashEndFrac = frac(hitMs + FLASH_MS);
    flashes += `<circle cx="${c.cx}" cy="${c.cy}" r="5" fill="${COLORS.flash}" opacity="0">
      <animate attributeName="opacity" calcMode="discrete" dur="${dur}" repeatCount="indefinite"
        values="0;1;0" keyTimes="0;${hitFrac};${flashEndFrac}"/>
    </circle>\n`;
  });

  // ----- rocket flight path -----
  // Keyframes: start centered under the first target, hop to each target's
  // x just as it's destroyed, then hold at the end and snap back at loop start.
  const startX = targets.length ? targets[0].cx : width / 2;
  const rocketKeyTimes = ["0.000000"];
  const rocketValues = [`${startX},${rocketY}`];
  targets.forEach((c, i) => {
    rocketKeyTimes.push(frac(i * HIT_STEP_MS));
    rocketValues.push(`${c.cx},${rocketY}`);
  });
  rocketKeyTimes.push("1.000000");
  rocketValues.push(rocketValues[rocketValues.length - 1]);

  const rocketSVG = `
  <g id="rocket">
    <animateTransform attributeName="transform" type="translate" additive="sum"
      calcMode="linear" dur="${dur}" repeatCount="indefinite"
      keyTimes="${rocketKeyTimes.join(";")}"
      values="${rocketValues.join(";")}"/>
    <g transform="translate(-9,-14)">
      <polygon points="9,0 16,20 9,16 2,20" fill="${COLORS.rocketBody}"/>
      <circle cx="9" cy="8" r="2.6" fill="${COLORS.rocketBelly}"/>
      <polygon points="6,17 9,24 4,20" fill="${COLORS.rocketFlame}"/>
      <polygon points="12,17 9,24 14,20" fill="${COLORS.rocketFlame}"/>
    </g>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="'Segoe UI', Helvetica, Arial, sans-serif">
  <rect width="${width}" height="${height}" fill="${COLORS.bg}"/>
  ${cellRects}
  ${targetRects}
  ${flashes}
  ${rocketSVG}
</svg>`;
}

// ---------- 3. Entry point ----------
async function main() {
  const login = process.env.GITHUB_LOGIN;
  const token = process.env.GITHUB_TOKEN;
  if (!login || !token) {
    console.error("Set GITHUB_LOGIN and GITHUB_TOKEN env vars.");
    process.exit(1);
  }
  const weeks = await fetchContributions(login, token);
  const svg = buildSVG(weeks);
  const outDir = path.join(process.cwd(), "game");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "contribution-rocket.svg");
  await writeFile(outFile, svg, "utf8");
  console.log("Wrote", outFile);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
