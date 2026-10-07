import console from "node:console";
import {execFileSync} from "node:child_process";
import path from "node:path";
import process from "node:process";
import {readFileSync} from "node:fs";

const DEFAULT_COMPARE_BRANCH = "origin/main";
const DEFAULT_FAIL_UNDER = 95;
const SEPARATOR = "-------------";

interface Options {
  compareBranch: string;
  coverageFiles: string[];
  failUnder: number;
}

interface FileCoverage {
  branches: Map<number, boolean>;
  lines: Map<number, number>;
}

interface CoverageCounts {
  hits: number;
  misses: number;
  partials: number;
}

interface FileResult extends CoverageCounts {
  sourcePath: string;
  total: number;
}

interface PatchCoverage extends CoverageCounts {
  files: FileResult[];
}

const COUNT_KEYS = {
  hit: "hits",
  miss: "misses",
  partial: "partials",
} as const satisfies Record<string, keyof CoverageCounts>;

type LineClassification = keyof typeof COUNT_KEYS;

/**
 * Parses CLI arguments into the compare branch, the threshold, and the LCOV files.
 * @param argv - Arguments after the script path.
 * @returns The validated options.
 */
function parseArguments(argv: string[]): Options {
  const coverageFiles: string[] = [];
  let compareBranch = DEFAULT_COMPARE_BRANCH;
  let failUnder = DEFAULT_FAIL_UNDER;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? "";
    const value = argv[index + 1];

    if (argument === "--compare-branch") {
      compareBranch = value ?? compareBranch;
      index += 1;
    } else if (argument === "--fail-under") {
      failUnder = Number(value ?? failUnder);
      index += 1;
    } else {
      coverageFiles.push(argument);
    }
  }

  return validateOptions({
    compareBranch,
    coverageFiles,
    failUnder,
  });
}

/**
 * Rejects options that cannot produce a meaningful report.
 * @param options - Parsed options.
 * @returns The same options.
 */
function validateOptions(options: Options): Options {
  if (options.coverageFiles.length === 0) {
    throw new Error("At least one LCOV file is required.");
  }

  const {failUnder} = options;

  if (!Number.isFinite(failUnder) || failUnder < 0 || failUnder > 100) {
    throw new Error("--fail-under must be a number between 0 and 100.");
  }

  return options;
}

/**
 * Converts an LCOV source path to a repository-relative POSIX path, the form `git diff` prints.
 * @param sourcePath - Path from an LCOV `SF:` record.
 * @returns The repository-relative path.
 */
function normalizeSourcePath(sourcePath: string): string {
  const root = process.cwd();
  const absolute = path.resolve(sourcePath);

  return path.relative(root, absolute).replaceAll("\\", "/");
}

/**
 * Creates an empty coverage record for one source file.
 * @returns A record with no lines or branches.
 */
function createFileCoverage(): FileCoverage {
  return {
    branches: new Map(),
    lines: new Map(),
  };
}

/**
 * Adds the hits and uncovered branches of one record into another.
 * @param target - Record that accumulates the coverage.
 * @param source - Record to add.
 */
function mergeCoverage(target: FileCoverage, source: FileCoverage): void {
  for (const [line, hits] of source.lines) {
    target.lines.set(line, (target.lines.get(line) ?? 0) + hits);
  }

  for (const [line, hasUncoveredBranch] of source.branches) {
    target.branches.set(line, (target.branches.get(line) ?? false) || hasUncoveredBranch);
  }
}

/**
 * Records one `DA:` line, which holds the hit count of a source line.
 * @param current - Record of the current source file.
 * @param data - Text after `DA:`.
 */
function recordLine(current: FileCoverage, data: string): void {
  const [lineText, hitsText] = data.split(",", 2);
  const line = Number(lineText);
  const hits = Number(hitsText);

  if (Number.isSafeInteger(line) && Number.isFinite(hits)) {
    current.lines.set(line, (current.lines.get(line) ?? 0) + hits);
  }
}

/**
 * Records one `BRDA:` line, which marks whether a branch on a source line went untaken.
 * @param current - Record of the current source file.
 * @param data - Text after `BRDA:`.
 */
function recordBranch(current: FileCoverage, data: string): void {
  const branchData = data.split(",", 4);
  const line = Number(branchData[0]);

  if (!Number.isSafeInteger(line)) {
    return;
  }

  const taken = branchData[3];
  const hasUncoveredBranch = taken === "-" || Number(taken) === 0;

  current.branches.set(line, (current.branches.get(line) ?? false) || hasUncoveredBranch);
}

/**
 * Reads one LCOV file into per-file coverage records.
 * @param filePath - LCOV file to read.
 * @returns Coverage keyed by repository-relative source path.
 */
function parseLcov(filePath: string): Map<string, FileCoverage> {
  const reports = new Map<string, FileCoverage>();
  let current: FileCoverage | undefined;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    if (rawLine.startsWith("SF:")) {
      const sourcePath = normalizeSourcePath(rawLine.slice(3));

      current = reports.get(sourcePath) ?? createFileCoverage();
      reports.set(sourcePath, current);
    }

    if (current !== undefined && rawLine.startsWith("DA:")) {
      recordLine(current, rawLine.slice(3));
    }

    if (current !== undefined && rawLine.startsWith("BRDA:")) {
      recordBranch(current, rawLine.slice(5));
    }
  }

  return reports;
}

/**
 * Merges every LCOV file into one coverage map.
 * @param coverageFiles - LCOV files to read.
 * @returns Coverage keyed by repository-relative source path.
 */
function loadCoverage(coverageFiles: string[]): Map<string, FileCoverage> {
  const coverage = new Map<string, FileCoverage>();

  for (const filePath of coverageFiles) {
    for (const [sourcePath, report] of parseLcov(filePath)) {
      const target = coverage.get(sourcePath) ?? createFileCoverage();

      mergeCoverage(target, report);
      coverage.set(sourcePath, target);
    }
  }

  return coverage;
}

/**
 * Expands a unified diff hunk header into the line numbers it adds.
 * @param header - Hunk header such as `@@ -1,2 +3,4 @@`.
 * @returns The new-side line numbers.
 */
function hunkLines(header: string): number[] {
  const match = /\+(\d+)(?:,(\d+))?/u.exec(header);

  if (match === null) {
    return [];
  }

  const start = Number(match[1]);
  const count = Number(match[2] ?? "1");

  return Array.from(
    {
      length: count,
    },
    (_, offset) => start + offset,
  );
}

/**
 * Lists the lines each covered file adds or changes relative to the compare branch.
 * @param compareBranch - Branch whose merge base the diff starts from.
 * @param sourcePaths - Files to diff.
 * @returns Changed line numbers keyed by repository-relative path.
 */
function parseChangedLines(
  compareBranch: string,
  sourcePaths: Iterable<string>,
): Map<string, Set<number>> {
  const diff = execFileSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- runs the developer's or CI runner's git.
    "git",
    ["diff", "--unified=0", `${compareBranch}...HEAD`, "--", ...sourcePaths],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );

  const changedLines = new Map<string, Set<number>>();
  let currentLines: Set<number> | undefined;

  for (const line of diff.split(/\r?\n/u)) {
    if (line.startsWith("+++ b/")) {
      const currentPath = line.slice(6);

      currentLines = changedLines.get(currentPath) ?? new Set();
      changedLines.set(currentPath, currentLines);
    }

    if (currentLines !== undefined && line.startsWith("@@")) {
      for (const changedLine of hunkLines(line)) {
        currentLines.add(changedLine);
      }
    }
  }

  return changedLines;
}

/**
 * Classifies one changed line the way Codecov counts patch coverage.
 * @param report - Coverage of the file that owns the line.
 * @param line - Line number.
 * @returns The classification, or `undefined` when the line is not executable.
 */
function classifyLine(report: FileCoverage, line: number): LineClassification | undefined {
  const hits = report.lines.get(line);
  const branches = report.branches.get(line);

  if (hits === undefined) {
    if (branches === undefined) {
      return undefined;
    }

    return branches ? "partial" : "hit";
  }

  if (hits === 0) {
    return "miss";
  }

  return branches === true ? "partial" : "hit";
}

/**
 * Counts hits, partials, and misses on the changed lines of one file.
 * @param report - Coverage of the file.
 * @param changed - Changed line numbers of the file.
 * @returns The counts.
 */
function countFile(report: FileCoverage, changed: Set<number>): CoverageCounts {
  const counts: CoverageCounts = {
    hits: 0,
    misses: 0,
    partials: 0,
  };

  for (const line of changed) {
    const classification = classifyLine(report, line);

    if (classification !== undefined) {
      counts[COUNT_KEYS[classification]] += 1;
    }
  }

  return counts;
}

/**
 * Counts hits, partials, and misses on the changed lines of every covered file.
 * @param coverage - Coverage keyed by source path.
 * @param changedLines - Changed lines keyed by source path.
 * @returns Totals plus one entry per file with at least one executable changed line.
 */
function calculatePatchCoverage(
  coverage: Map<string, FileCoverage>,
  changedLines: Map<string, Set<number>>,
): PatchCoverage {
  const files = [...coverage]
    .map(([sourcePath, report]): FileResult => {
      const counts = countFile(report, changedLines.get(sourcePath) ?? new Set());

      return {
        sourcePath,
        ...counts,
        total: counts.hits + counts.partials + counts.misses,
      };
    })
    .filter(file => file.total > 0);

  return {
    files,
    hits: files.reduce((sum, file) => sum + file.hits, 0),
    misses: files.reduce((sum, file) => sum + file.misses, 0),
    partials: files.reduce((sum, file) => sum + file.partials, 0),
  };
}

/**
 * Computes a coverage percentage, treating an empty patch as fully covered.
 * @param hits - Covered lines.
 * @param total - Executable lines.
 * @returns The percentage from 0 to 100.
 */
function percentage(hits: number, total: number): number {
  return total === 0 ? 100 : (hits / total) * 100;
}

const {compareBranch, coverageFiles, failUnder} = parseArguments(process.argv.slice(2));
const coverage = loadCoverage(coverageFiles);
const changedLines = parseChangedLines(compareBranch, coverage.keys());
const result = calculatePatchCoverage(coverage, changedLines);
const total = result.hits + result.partials + result.misses;
const patchCoverage = percentage(result.hits, total);

console.log(SEPARATOR);
console.log("Codecov-compatible Patch Coverage");
console.log(`Diff: ${compareBranch}...HEAD`);
console.log(SEPARATOR);

for (const file of result.files) {
  const fileCoverage = percentage(file.hits, file.total).toFixed(5);

  console.log(
    `${file.sourcePath}: ${fileCoverage}% (${file.misses} misses, ${file.partials} partials)`,
  );
}

console.log(SEPARATOR);
console.log(`Hits: ${result.hits}`);
console.log(`Partials: ${result.partials}`);
console.log(`Misses: ${result.misses}`);
console.log(`Total: ${total}`);
console.log(`Coverage: ${patchCoverage.toFixed(5)}%`);
console.log(`Required: ${failUnder.toFixed(2)}%`);
console.log(SEPARATOR);

if (patchCoverage < failUnder) {
  console.error(
    `Patch coverage ${patchCoverage.toFixed(5)}% is below the required ${failUnder.toFixed(2)}%.`,
  );

  process.exitCode = 1;
}
