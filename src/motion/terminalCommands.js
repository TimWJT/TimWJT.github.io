/**
 * The command registry behind the hidden terminal panel (`Terminal.jsx`).
 *
 * The interface is deliberately tiny, because it is the contract other parts of
 * the site are written against:
 *
 *   registerCommand(name, { help, run })  add (or replace) one command
 *   getCommands()                         every command, sorted by name
 *
 * `name` is lower case and takes no arguments, so the panel can dispatch on a
 * single lookup instead of parsing. `help` is one plain line, printed verbatim
 * by the `help` command. `run` takes nothing and returns an array of lines for
 * the panel to print; throwing is how a command reports a friendly failure, and
 * the panel prints the Error's message and carries on.
 *
 * An optional `clear: true` marks a command that empties the scrollback instead
 * of printing anything (`clear` is the only one). Registering a name twice does
 * not throw: the later definition simply replaces the earlier one, so a feature
 * that wants to own a name can take it over without ordering games with whoever
 * registered first.
 *
 * Nothing here touches storage, timers, the network or the DOM, so the whole
 * registry is exercisable in a test with a fake clock and no layout.
 */
import { profile, about, education, projects, leadership, skills } from '../data/content';

// One entry per name. A Map is used rather than an object literal so a name
// like "constructor" or "toString" cannot collide with Object.prototype.
const registry = new Map();

const register = (name, entry) => {
  registry.set(name, { clear: false, ...entry, name });
  return registry.get(name);
};

/**
 * Add or replace one command. `help` and `run` follow the contract above;
 * `clear: true` is the one optional extra.
 */
export function registerCommand(name, entry) {
  return register(name, entry);
}

/** Every registered command, sorted by name, so `help` output is stable. */
export function getCommands() {
  return [...registry.values()].sort((first, second) => first.name.localeCompare(second.name));
}

registerCommand('about', {
  help: 'Who Tim is, in his own words from the About section.',
  // `whoami` carries the short identity, so this one is the long form: the
  // tagline and then the same three paragraphs the About section renders.
  run: () => [profile.tagline, '', ...about.paragraphs],
});

registerCommand('clear', {
  help: 'Empty the scrollback.',
  clear: true,
  run: () => [],
});

registerCommand('help', {
  help: 'List every command, with one line each.',
  run: () => {
    const commands = getCommands();
    // Pad to the longest name so the descriptions line up, the way `man` does.
    const width = commands.reduce((widest, command) => Math.max(widest, command.name.length), 0);
    return [`${commands.length} commands:`, ...commands.map(command => `  ${command.name.padEnd(width)}  ${command.help}`)];
  },
});

registerCommand('projects', {
  help: 'List the projects, with results and stacks.',
  run: () => [
    `${projects.length} things I have built:`,
    ...projects.map(project => {
      const result = project.result ? ` — ${project.result}` : '';
      const stack = project.stack?.length ? ` [${project.stack.join(', ')}]` : '';
      return `  ${project.title}${result}${stack}`;
    }),
  ],
});

registerCommand('stack', {
  help: 'Languages, tools, AI work, and what is done outside code.',
  run: () => skills.map(group => `${group.label}: ${group.items.join(', ')}`),
});

registerCommand('whoami', {
  help: 'Name, university, and the society that took over my calendar.',
  run: () => [
    `${profile.name} (${profile.legalName})`,
    ...profile.roles.map(role => `  ${role}`),
    '',
    `${profile.location} · ${profile.citizenship}`,
    `${education.school} — ${education.degree}`,
    `${education.major} · ${education.period}`,
    ...leadership.slice(0, 1).flatMap(entry => entry.roles.map(role => `${entry.org} — ${role.title} (${role.period})`)),
  ],
});
