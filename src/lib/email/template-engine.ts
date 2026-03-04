const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

export function extractVariables(html: string): string[] {
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = VARIABLE_REGEX.exec(html)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

export function renderTemplate(
  html: string,
  variables: Record<string, string>
): string {
  return html.replace(VARIABLE_REGEX, (_, key: string) => {
    return variables[key] ?? `{{${key}}}`;
  });
}
