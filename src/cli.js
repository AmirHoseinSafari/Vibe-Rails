// Entry point. Every command prints short plain text and exits 0 (fine) or 1 (blocked).
import { UserError, findRoot } from './lib/project.js';
import { installHooks, rememberCli } from './lib/git.js';
import * as commands from './commands.js';
import { hook } from './hook.js';

const HELP = `vibe-rails: guard rails for vibe coding

  next                              what to do now (start here, always)
  doctor                            check this computer is ready
  init <folder> --name "<name>"     create a new project
  brief set <topic> "<answer>"      record an interview answer
  brief show                        show the answers so far
  scope add [--bug] "<promise>"     add something the app must do
  scope list                        list the promises
  scope edit <id> "<promise>"       reword one
  scope drop <id> "<reason>"        remove one
  mockup show | approve             show the clickable mock-up; record the user's yes
  approve                           the user approved the plan; unlock building
  red <id> [--already-works "why"]  prove the new test for <id> fails first
  test                              run the tests
  check                             run the gate without saving
  save "<what changed>" --for <ids> | --tweak
                                    gate, then commit and push
  preview [stop]                    start the app in the background and print its address
  confirm <ids>                     the user tried it and it works
  undo [--last-save]                go back to the last saved version
  connect                           online backup is optional: lists the choices to offer the user
  connect --local                   keep the project on this computer only
  connect --manual                  steps for the user to create the repository themselves
  connect <github-url>              use the repository the user created
  connect --auto [--name "<name>"]  sign in from the browser and create it for them
  status                            one-line summary`;

export function parseArgs(argv) {
  const args = [];
  const flags = {};
  const valued = new Set(['name', 'for', 'already-works', 'template']);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      flags[key] = valued.has(key) ? argv[++i] ?? '' : true;
    } else {
      args.push(arg);
    }
  }
  return { args, flags };
}

async function main() {
  const [name, ...rest] = process.argv.slice(2);
  if (!name || name === 'help' || name === '--help') {
    console.log(HELP);
    return 0;
  }
  if (name === 'hook') return hook(rest[0]);

  const command = commands[name.replace(/-/g, '_')];
  if (!command) throw new UserError(`Unknown command "${name}". Run: vibe-rails help`);

  // Keep the gate wired up on every run, so it cannot quietly go missing.
  const root = findRoot();
  if (root) {
    installHooks(root);
    rememberCli(root);
  }
  return command(parseArgs(rest));
}

main().then(
  (code) => process.exit(code || 0),
  (error) => {
    if (error instanceof UserError) {
      console.error(error.message);
      process.exit(1);
    }
    console.error(error);
    process.exit(2);
  },
);
