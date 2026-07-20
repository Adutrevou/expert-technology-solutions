import fs from "node:fs";
import path from "node:path";

const REQUIRED_API_BASE_URL = "https://api.intergrai.co.za";
const DEPLOY_COMMAND =
  "rsync -av --delete --exclude 'server/' --exclude 'uploads/' /root/expert-technology-solutions/dist/ /var/www/experttechnologysolutions.intergrai.co.za/";
const APPROVED_AGENT_ROUTE = process.env.APPROVED_AGENT_ROUTE === "true";

const rootDir = process.cwd();
const envStaticPath = path.join(rootDir, ".env.static");
const packageJsonPath = path.join(rootDir, "package.json");
const distDir = path.join(rootDir, "dist");
const distIndexPath = path.join(distDir, "index.html");

let hasCriticalFailure = false;

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function warn(message) {
  console.warn(`[WARN] ${message}`);
}

function fail(message) {
  hasCriticalFailure = true;
  console.error(`[FAIL] ${message}`);
}

function safeRead(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function findAgentRouteSignals() {
  const signals = [];
  const routeTreePath = path.join(rootDir, "src", "routeTree.gen.ts");
  const routeFilePath = path.join(rootDir, "src", "routes", "agent.tsx");

  if (fs.existsSync(routeFilePath)) {
    signals.push("src/routes/agent.tsx exists");
  }

  if (fs.existsSync(routeTreePath)) {
    const routeTree = safeRead(routeTreePath);
    if (
      routeTree.includes("'./routes/agent'") ||
      routeTree.includes('"/agent"') ||
      routeTree.includes("'/agent'")
    ) {
      signals.push("src/routeTree.gen.ts references /agent");
    }
  }

  return signals;
}

function builtOutputContainsApiUrl() {
  if (!fs.existsSync(distDir)) {
    return null;
  }

  const filesToScan = [];
  const stack = [distDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (/\.(html|js|css|json|map|txt)$/i.test(entry.name)) {
        filesToScan.push(entryPath);
      }
    }
  }

  for (const filePath of filesToScan) {
    try {
      if (safeRead(filePath).includes(REQUIRED_API_BASE_URL)) {
        return path.relative(rootDir, filePath);
      }
    } catch {
      // Ignore unreadable non-critical assets.
    }
  }

  return false;
}

try {
  if (!fs.existsSync(envStaticPath)) {
    fail(".env.static is missing.");
  } else {
    pass(".env.static exists.");
    const envStatic = safeRead(envStaticPath);
    const apiBaseUrlLine = envStatic
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("VITE_LEADS_API_BASE_URL="));

    if (!apiBaseUrlLine) {
      fail(".env.static does not define VITE_LEADS_API_BASE_URL.");
    } else if (apiBaseUrlLine !== `VITE_LEADS_API_BASE_URL=${REQUIRED_API_BASE_URL}`) {
      fail(`.env.static must set VITE_LEADS_API_BASE_URL=${REQUIRED_API_BASE_URL}.`);
    } else {
      pass(".env.static points to the approved Intergrai Leads API base URL.");
    }
  }

  if (!fs.existsSync(packageJsonPath)) {
    fail("package.json is missing.");
  } else {
    const packageJson = JSON.parse(safeRead(packageJsonPath));
    if (
      packageJson?.scripts?.["build:static"] ===
      "VITE_STATIC_BUILD=true BUILD_STATIC=1 vite build --mode static"
    ) {
      pass("package.json contains the expected build:static script.");
    } else if (typeof packageJson?.scripts?.["build:static"] === "string") {
      pass("package.json contains a build:static script.");
      warn(
        "build:static differs from the confirmed recovery command. Verify it before production deploy.",
      );
    } else {
      fail("package.json does not contain build:static.");
    }
  }

  if (fs.existsSync(distDir)) {
    if (fs.existsSync(distIndexPath)) {
      pass("dist/index.html exists.");
    } else {
      fail("dist/ exists but dist/index.html is missing. Rebuild with npm run build:static.");
    }

    const builtUrlSignal = builtOutputContainsApiUrl();
    if (builtUrlSignal === false) {
      fail(`Built output does not contain ${REQUIRED_API_BASE_URL}.`);
    } else if (typeof builtUrlSignal === "string") {
      pass(`Built output contains the approved API base URL in ${builtUrlSignal}.`);
    }
  } else {
    warn("dist/ is not present yet. Run npm run build:static before deployment.");
  }

  const agentRouteSignals = findAgentRouteSignals();
  if (agentRouteSignals.length > 0 && !APPROVED_AGENT_ROUTE) {
    warn(
      `/agent route signals found but APPROVED_AGENT_ROUTE=true is not set: ${agentRouteSignals.join("; ")}`,
    );
  } else if (agentRouteSignals.length > 0) {
    pass(`/agent route signals found and explicitly approved: ${agentRouteSignals.join("; ")}`);
  } else {
    pass("No active /agent route signals found.");
  }

  console.log("");
  console.log("Correct deploy command:");
  console.log(DEPLOY_COMMAND);
} catch (error) {
  fail(
    `Unexpected predeploy check error: ${error instanceof Error ? error.message : String(error)}`,
  );
}

if (hasCriticalFailure) {
  process.exitCode = 1;
}
