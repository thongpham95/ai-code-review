"use client"

import React, { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileInfo {
    name: string
    content: string
    diff?: string
}

interface FileTreeProps {
    files: FileInfo[]
    selectedFile: string | null
    onSelectFile: (fileName: string) => void
}

interface TreeNode {
    name: string
    path: string
    isFolder: boolean
    children: TreeNode[]
    file?: FileInfo
    stats?: { additions: number; deletions: number }
}

function buildTree(files: FileInfo[]): TreeNode[] {
    const root: TreeNode[] = []

    for (const file of files) {
        const parts = file.name.split('/')
        let currentLevel = root

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            const path = parts.slice(0, i + 1).join('/')
            const isLast = i === parts.length - 1

            let existing = currentLevel.find(node => node.name === part)

            if (!existing) {
                const newNode: TreeNode = {
                    name: part,
                    path,
                    isFolder: !isLast,
                    children: [],
                    file: isLast ? file : undefined,
                    stats: isLast ? calculateStats(file.content, file.diff) : undefined,
                }
                currentLevel.push(newNode)
                existing = newNode
            }

            if (!isLast) {
                currentLevel = existing.children
            }
        }
    }

    // Sort: folders first, then files alphabetically
    const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1
            if (!a.isFolder && b.isFolder) return 1
            return a.name.localeCompare(b.name)
        }).map(node => ({
            ...node,
            children: sortNodes(node.children)
        }))
    }

    return sortNodes(root)
}

function calculateStats(content: string, diff?: string): { additions: number; deletions: number } {
    if (!diff) {
        return { additions: content.split('\n').length, deletions: 0 }
    }

    const lines = diff.split('\n')
    let additions = 0
    let deletions = 0

    for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            additions++
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            deletions++
        }
    }

    return { additions, deletions }
}

function TreeNodeComponent({
    node,
    depth,
    selectedFile,
    onSelectFile,
    expandedFolders,
    toggleFolder,
}: {
    node: TreeNode
    depth: number
    selectedFile: string | null
    onSelectFile: (fileName: string) => void
    expandedFolders: Set<string>
    toggleFolder: (path: string) => void
}) {
    const isExpanded = expandedFolders.has(node.path)
    const isSelected = selectedFile === node.path

    if (node.isFolder) {
        return (
            <div>
                <button
                    onClick={() => toggleFolder(node.path)}
                    className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-muted/50 rounded transition-colors",
                        "text-muted-foreground hover:text-foreground"
                    )}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                >
                    {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {isExpanded ? (
                        <FolderOpen className="h-4 w-4 shrink-0 text-blue-400" />
                    ) : (
                        <Folder className="h-4 w-4 shrink-0 text-blue-400" />
                    )}
                    <span className="truncate">{node.name}</span>
                </button>
                {isExpanded && (
                    <div>
                        {node.children.map((child) => (
                            <TreeNodeComponent
                                key={child.path}
                                node={child}
                                depth={depth + 1}
                                selectedFile={selectedFile}
                                onSelectFile={onSelectFile}
                                expandedFolders={expandedFolders}
                                toggleFolder={toggleFolder}
                            />
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <button
            onClick={() => onSelectFile(node.path)}
            className={cn(
                "w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors",
                isSelected
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
            <FileCode className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1 text-left">{node.name}</span>
            {node.stats && (
                <span className="flex items-center gap-1 text-xs shrink-0">
                    {node.stats.additions > 0 && (
                        <span className="text-green-500">+{node.stats.additions}</span>
                    )}
                    {node.stats.deletions > 0 && (
                        <span className="text-red-500">-{node.stats.deletions}</span>
                    )}
                </span>
            )}
        </button>
    )
}

export function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
    const tree = useMemo(() => buildTree(files), [files])

    // Auto-expand all folders by default
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
        const folders = new Set<string>()
        const collectFolders = (nodes: TreeNode[]) => {
            for (const node of nodes) {
                if (node.isFolder) {
                    folders.add(node.path)
                    collectFolders(node.children)
                }
            }
        }
        collectFolders(tree)
        return folders
    })

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev)
            if (next.has(path)) {
                next.delete(path)
            } else {
                next.add(path)
            }
            return next
        })
    }

    // Calculate total stats
    const totalStats = useMemo(() => {
        let additions = 0
        let deletions = 0
        for (const file of files) {
            const stats = calculateStats(file.content, file.diff)
            additions += stats.additions
            deletions += stats.deletions
        }
        return { additions, deletions }
    }, [files])

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-3 py-2 border-b flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Files ({files.length})
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                    <span className="text-green-500 font-medium">+{totalStats.additions}</span>
                    <span className="text-red-500 font-medium">-{totalStats.deletions}</span>
                </span>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto py-1">
                {tree.map((node) => (
                    <TreeNodeComponent
                        key={node.path}
                        node={node}
                        depth={0}
                        selectedFile={selectedFile}
                        onSelectFile={onSelectFile}
                        expandedFolders={expandedFolders}
                        toggleFolder={toggleFolder}
                    />
                ))}
            </div>
        </div>
    )
}

export default FileTree
