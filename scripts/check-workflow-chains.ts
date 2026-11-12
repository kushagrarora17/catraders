import { basename } from "node:path";

type Job = { if?: string; steps?: { if?: string; run?: string }[] };
type Workflow = { name?: string; on?: Record<string, { workflows?: string[] } | null>; jobs?: Record<string, Job> };
type Run = { path: string; event: string; upstreamEvent?: string };

// Only infer event restrictions from conjunctions; unknown expressions remain possible.
function possible(condition: string | undefined, run: Run): boolean {
  if (!condition) return true;
  if (condition.includes("||")) return true;
  const restrictions = [...condition.matchAll(/github\.(event_name|event\.workflow_run\.event)\s*==\s*['"]([^'"]+)['"]/g)];
  return restrictions.every(([, field, expected]) =>
    (field === "event_name" ? run.event : run.upstreamEvent) === expected);
}

type Context = {
  workflows: Map<string, Workflow>;
  byName: Map<string, string>;
  byFile: Map<string, string>;
  scriptFiles: Set<string>;
  errors: string[];
};

async function sourceCode(code: string, files: Set<string>): Promise<string> {
  for (const [, path] of code.matchAll(/\b(?:bash|sh)\s+(\.github\/scripts\/[\w./-]+\.sh)\b/g)) {
    if (files.has(path)) code += `\n${await Bun.file(path).text()}`;
  }
  return code;
}

function resolveTarget(target: string, context: Context): string | undefined {
  const name = target.replace(/^['"]|['"]$/g, "");
  const path = context.byFile.get(name) ?? context.byName.get(name);
  if (!path) context.errors.push(`Cannot statically resolve workflow dispatch target ${target}`);
  return path;
}

function dispatchTargets(code: string, context: Context): Run[] {
  const targets: Run[] = [];
  for (const [, target] of code.matchAll(/\bgh\s+workflow\s+run\s+([^\s;|]+)/g)) {
    const path = resolveTarget(target, context);
    if (path) targets.push({ path, event: "workflow_dispatch" });
  }
  return targets;
}

async function dispatches(job: Job, context: Context): Promise<Run[]> {
  const targets: Run[] = [];
  for (const step of job.steps ?? []) {
    const code = await sourceCode(step.run ?? "", context.scriptFiles);
    targets.push(...dispatchTargets(code, context));
  }
  return targets;
}

function followsWorkflow(candidate: Workflow, name: string) {
  return (candidate.on?.workflow_run?.workflows ?? []).includes(name);
}

function possibleJobs(candidate: Workflow, run: Run) {
  return Object.values(candidate.jobs ?? {}).some(job => possible(job.if, run));
}

function workflowName(workflow: Workflow, path: string) {
  return workflow.name ?? basename(path);
}

function triggeredRuns(run: Run, context: Context): Run[] {
  const name = workflowName(context.workflows.get(run.path)!, run.path);
  const result: Run[] = [];
  for (const [path, candidate] of context.workflows) {
    const following = { path, event: "workflow_run", upstreamEvent: run.event };
    if (followsWorkflow(candidate, name) && possibleJobs(candidate, following)) result.push(following);
  }
  return result;
}

function workflowJobs(context: Context, run: Run) {
  return Object.values(context.workflows.get(run.path)?.jobs ?? {});
}

async function nextRuns(run: Run, context: Context): Promise<Run[]> {
  const result = triggeredRuns(run, context);
  for (const job of workflowJobs(context, run)) {
    if (possible(job.if, run)) result.push(...await dispatches(job, context));
  }
  return result;
}

function initialRuns(workflows: Map<string, Workflow>): { run: Run; chain: string[] }[] {
  return [...workflows].flatMap(([path, workflow]) => Object.keys(workflow.on ?? {})
    .filter(event => event !== "workflow_run" && event !== "workflow_call")
    .map(event => ({ run: { path, event }, chain: [`${path} (${event})`] })));
}

async function walk(context: Context): Promise<void> {
  const queue = initialRuns(context.workflows);
  while (queue.length) {
    const { run, chain } = queue.shift()!;
    for (const target of await nextRuns(run, context)) {
      const following = [...chain, `${target.path} (${target.event})`];
      if (following.length > 3) context.errors.push(`Workflow chain exceeds three levels: ${following.join(" -> ")}`);
      else queue.push({ run: target, chain: following });
    }
  }
}

export async function checkWorkflowChains(files: string[]): Promise<string[]> {
  const paths = files.filter(path => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path));
  const workflows = new Map<string, Workflow>();
  for (const path of paths) workflows.set(path, Bun.YAML.parse(await Bun.file(path).text()) as Workflow);
  const context: Context = {
    workflows,
    byName: new Map([...workflows].map(([path, workflow]) => [workflow.name ?? basename(path), path])),
    byFile: new Map(paths.map(path => [basename(path), path])),
    scriptFiles: new Set(files),
    errors: [],
  };
  await walk(context);
  return [...new Set(context.errors)];
}
