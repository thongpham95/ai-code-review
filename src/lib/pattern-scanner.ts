export interface PatternMatch {
    rule: string;
    severity: "error" | "warning" | "info";
    line: number;
    column: number;
    message: string;
    snippet: string;
}

interface PatternRule {
    name: string;
    pattern: RegExp;
    severity: "error" | "warning" | "info";
    message: string;
}

const RULES: PatternRule[] = [
    // Security
    {
        name: "hardcoded-secret",
        pattern: /(?:password|secret|api_key|apikey|token|private_key)\s*[:=]\s*["'][^"']{8,}["']/gi,
        severity: "error",
        message: "Possible hardcoded secret or credential detected.",
    },
    {
        name: "aws-access-key",
        pattern: /AKIA[0-9A-Z]{16}/g,
        severity: "error",
        message: "AWS Access Key ID detected.",
    },
    {
        name: "private-key",
        pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
        severity: "error",
        message: "Private key detected in source code.",
    },
    // Debug leftovers
    {
        name: "console-log",
        pattern: /console\.(log|debug|info|warn|error)\s*\(/g,
        severity: "warning",
        message: "Console statement found. Remove before production.",
    },
    {
        name: "debugger",
        pattern: /\bdebugger\b/g,
        severity: "warning",
        message: "Debugger statement found.",
    },
    // TODOs
    {
        name: "todo-comment",
        pattern: /\/\/\s*(TODO|FIXME|HACK|XXX|BUG)\b/gi,
        severity: "info",
        message: "TODO/FIXME comment found.",
    },
    // Code quality
    {
        name: "any-type",
        pattern: /:\s*any\b/g,
        severity: "warning",
        message: "Usage of 'any' type detected. Consider using a specific type.",
    },
    {
        name: "empty-catch",
        pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
        severity: "warning",
        message: "Empty catch block found. Errors should be handled.",
    },
    {
        name: "eval-usage",
        pattern: /\beval\s*\(/g,
        severity: "error",
        message: "Usage of eval() detected. This is a security risk.",
    },
    {
        name: "innerhtml",
        pattern: /\.innerHTML\s*=/g,
        severity: "warning",
        message: "Direct innerHTML assignment detected. Risk of XSS.",
    },
];

export class PatternScanner {
    private rules: PatternRule[];

    constructor(customRules?: PatternRule[]) {
        this.rules = customRules || RULES;
    }

    scan(code: string, filename?: string): PatternMatch[] {
        const matches: PatternMatch[] = [];
        const lines = code.split("\n");

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];

            for (const rule of this.rules) {
                // Reset lastIndex for global regex
                rule.pattern.lastIndex = 0;
                let match;

                while ((match = rule.pattern.exec(line)) !== null) {
                    matches.push({
                        rule: rule.name,
                        severity: rule.severity,
                        line: lineIndex + 1,
                        column: match.index + 1,
                        message: rule.message + (filename ? ` (${filename})` : ""),
                        snippet: line.trim(),
                    });
                }
            }
        }

        return matches;
    }

    scanMultipleFiles(files: { name: string; content: string }[]): PatternMatch[] {
        const allMatches: PatternMatch[] = [];
        for (const file of files) {
            const fileMatches = this.scan(file.content, file.name);
            allMatches.push(...fileMatches);
        }
        return allMatches;
    }

    static getSummary(matches: PatternMatch[]): { errors: number; warnings: number; infos: number; total: number } {
        return {
            errors: matches.filter((m) => m.severity === "error").length,
            warnings: matches.filter((m) => m.severity === "warning").length,
            infos: matches.filter((m) => m.severity === "info").length,
            total: matches.length,
        };
    }
}
