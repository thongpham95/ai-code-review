"use client"

import React, { useMemo } from 'react'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import java from 'highlight.js/lib/languages/java'
import 'highlight.js/styles/github-dark.css'

// Register languages
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('java', java)
hljs.registerLanguage('tsx', typescript)
hljs.registerLanguage('jsx', javascript)

interface DiffViewerProps {
    oldCode: string
    newCode: string
    fileName: string
    splitView?: boolean
    showLineNumbers?: boolean
}

function getLanguageFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const langMap: Record<string, string> = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        css: 'css',
        scss: 'css',
        json: 'json',
        html: 'html',
        xml: 'xml',
        sh: 'bash',
        bash: 'bash',
        sql: 'sql',
        go: 'go',
        rs: 'rust',
        java: 'java',
    }
    return langMap[ext] || 'plaintext'
}

function highlightSyntax(code: string, language: string): React.ReactNode[] {
    try {
        if (language === 'plaintext') {
            return code.split('\n').map((line, i) => (
                <span key={i}>{line}</span>
            ))
        }
        const highlighted = hljs.highlight(code, { language }).value
        // Split by lines and return as React elements
        return highlighted.split('\n').map((line, i) => (
            <span key={i} dangerouslySetInnerHTML={{ __html: line || ' ' }} />
        ))
    } catch {
        return code.split('\n').map((line, i) => (
            <span key={i}>{line}</span>
        ))
    }
}

export function DiffViewer({
    oldCode,
    newCode,
    fileName,
    splitView = false,
    showLineNumbers = true,
}: DiffViewerProps) {
    const language = useMemo(() => getLanguageFromFileName(fileName), [fileName])

    // Calculate stats
    const stats = useMemo(() => {
        const oldLines = oldCode.split('\n')
        const newLines = newCode.split('\n')
        const additions = newLines.filter((line, i) => !oldLines.includes(line)).length
        const deletions = oldLines.filter((line, i) => !newLines.includes(line)).length
        return { additions, deletions }
    }, [oldCode, newCode])

    const customStyles = {
        variables: {
            dark: {
                diffViewerBackground: 'hsl(var(--background))',
                diffViewerColor: 'hsl(var(--foreground))',
                addedBackground: 'rgba(34, 197, 94, 0.15)',
                addedColor: 'hsl(var(--foreground))',
                removedBackground: 'rgba(239, 68, 68, 0.15)',
                removedColor: 'hsl(var(--foreground))',
                wordAddedBackground: 'rgba(34, 197, 94, 0.3)',
                wordRemovedBackground: 'rgba(239, 68, 68, 0.3)',
                addedGutterBackground: 'rgba(34, 197, 94, 0.2)',
                removedGutterBackground: 'rgba(239, 68, 68, 0.2)',
                gutterBackground: 'hsl(var(--muted))',
                gutterBackgroundDark: 'hsl(var(--muted))',
                highlightBackground: 'rgba(59, 130, 246, 0.1)',
                highlightGutterBackground: 'rgba(59, 130, 246, 0.2)',
                codeFoldGutterBackground: 'hsl(var(--muted))',
                codeFoldBackground: 'hsl(var(--muted))',
                emptyLineBackground: 'hsl(var(--muted))',
                gutterColor: 'hsl(var(--muted-foreground))',
                addedGutterColor: 'rgb(34, 197, 94)',
                removedGutterColor: 'rgb(239, 68, 68)',
                codeFoldContentColor: 'hsl(var(--muted-foreground))',
                diffViewerTitleBackground: 'hsl(var(--muted))',
                diffViewerTitleColor: 'hsl(var(--foreground))',
                diffViewerTitleBorderColor: 'hsl(var(--border))',
            },
        },
        line: {
            padding: '2px 10px',
            fontSize: '13px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
        gutter: {
            padding: '0 10px',
            minWidth: '40px',
            fontSize: '12px',
        },
        contentText: {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
    }

    return (
        <div className="rounded-lg border overflow-hidden">
            {/* File Header */}
            <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-mono text-sm font-medium">{fileName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    {stats.additions > 0 && (
                        <span className="text-green-500 font-medium">+{stats.additions}</span>
                    )}
                    {stats.deletions > 0 && (
                        <span className="text-red-500 font-medium">-{stats.deletions}</span>
                    )}
                </div>
            </div>

            {/* Diff Content */}
            <div className="overflow-x-auto text-sm">
                <ReactDiffViewer
                    oldValue={oldCode}
                    newValue={newCode}
                    splitView={splitView}
                    useDarkTheme={true}
                    styles={customStyles}
                    compareMethod={DiffMethod.WORDS}
                    hideLineNumbers={!showLineNumbers}
                    renderContent={(source: string) => {
                        const lines = highlightSyntax(source, language)
                        return (
                            <pre className="m-0 p-0 bg-transparent">
                                {lines.map((line, i) => (
                                    <React.Fragment key={i}>
                                        {line}
                                        {i < lines.length - 1 && '\n'}
                                    </React.Fragment>
                                ))}
                            </pre>
                        )
                    }}
                />
            </div>
        </div>
    )
}

// Simple code viewer with line numbers (for non-diff content)
interface CodeViewerProps {
    code: string
    fileName: string
    showLineNumbers?: boolean
}

export function CodeViewer({ code, fileName, showLineNumbers = true }: CodeViewerProps) {
    const language = useMemo(() => getLanguageFromFileName(fileName), [fileName])
    const lines = useMemo(() => code.split('\n'), [code])

    const highlightedLines = useMemo(() => {
        try {
            if (language === 'plaintext') {
                return lines
            }
            const result = hljs.highlight(code, { language })
            return result.value.split('\n')
        } catch {
            return lines
        }
    }, [code, language, lines])

    return (
        <div className="rounded-lg border overflow-hidden">
            {/* File Header */}
            <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-mono text-sm font-medium">{fileName}</span>
                <span className="text-xs text-muted-foreground ml-auto">{lines.length} lines</span>
            </div>

            {/* Code Content */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <tbody>
                        {highlightedLines.map((line, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                                {showLineNumbers && (
                                    <td className="px-3 py-0.5 text-right text-xs text-muted-foreground select-none border-r border-border/50 bg-muted/30 w-12 font-mono">
                                        {i + 1}
                                    </td>
                                )}
                                <td className="px-4 py-0.5 font-mono whitespace-pre">
                                    <span dangerouslySetInnerHTML={{ __html: line || ' ' }} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default DiffViewer
