const fs = require("fs");

const USERNAME = "BuiltBySahil";
const API_URL = `https://gh-calendar.rschristian.dev/user/${USERNAME}`;

async function generateContributionSVG() {
  console.log(`Fetching contributions for ${USERNAME}...`);

  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub contribution data: ${response.status}`);
  }

  const data = await response.json();

  const weeks = data.contributions;
  const total = data.total;

  const cellSize = 14;
  const gap = 4;

  const left = 30;
  const top = 45;

  const width = left + weeks.length * (cellSize + gap) + 30;
  const height = top + 7 * (cellSize + gap) + 55;

  let cells = "";
  let glowCircles = "";

  weeks.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      const x = left + weekIndex * (cellSize + gap);
      const y = top + dayIndex * (cellSize + gap);

      const count = Number(day.count || 0);
      const intensity = Number(day.intensity || 0);

      const colors = [
        "#161b22",
        "#0e4429",
        "#006d32",
        "#26a641",
        "#39d353"
      ];

      const color = colors[Math.min(intensity, 4)];

      cells += `
        <rect
          x="${x}"
          y="${y}"
          width="${cellSize}"
          height="${cellSize}"
          rx="3"
          fill="${color}"
        />
      `;

      /*
       * Add our custom glowing effect to
       * selected high-contribution days.
       */
      if (count >= 5) {
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        glowCircles += `
          <circle
            cx="${cx}"
            cy="${cy}"
            r="9"
            fill="none"
            stroke="#39d353"
            stroke-width="2"
            opacity="0.9">

            <animate
              attributeName="r"
              values="8;12;8"
              dur="2s"
              repeatCount="indefinite" />

            <animate
              attributeName="opacity"
              values="0.9;0.2;0.9"
              dur="2s"
              repeatCount="indefinite" />
          </circle>
        `;
      }
    });
  });

  const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}">

  <rect
    width="100%"
    height="100%"
    rx="14"
    fill="#0d1117"/>

  <text
    x="${left}"
    y="25"
    fill="#f0f6fc"
    font-family="Arial, sans-serif"
    font-size="16"
    font-weight="bold">
    🥊 BuiltBySahil • GitHub Contribution Activity
  </text>

  ${cells}

  ${glowCircles}

  <text
    x="${left}"
    y="${height - 15}"
    fill="#8b949e"
    font-family="Arial, sans-serif"
    font-size="14">
    ${total} contributions
  </text>

</svg>
`;

fs.mkdirSync("Contribution", { recursive: true });

fs.writeFileSync(
  "Contribution/contribution.svg",
  svg.trim()
);

  console.log("✅ contribution/contribution.svg generated successfully!");
}

generateContributionSVG().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
