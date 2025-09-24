'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  FileText,
  FileCode,
  FileImage,
  FileJson,
  FileArchive
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  content?: string
  size?: number
  modified?: Date
}

interface FileTreeProps {
  files: FileNode[]
  selectedFile?: string
  onFileSelect: (file: FileNode) => void
  onFileRename?: (fileId: string, newName: string) => void
  onFileDelete?: (fileId: string) => void
  className?: string
}

const getFileIcon = (fileName: string, isFolder: boolean = false) => {
  if (isFolder) return <Folder className="h-4 w-4" />
  
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'html':
      return <FileText className="h-4 w-4 text-orange-500" />
    case 'css':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'js':
    case 'jsx':
      return <FileText className="h-4 w-4 text-yellow-500" />
    case 'ts':
    case 'tsx':
      return <FileText className="h-4 w-4 text-blue-600" />
    case 'json':
      return <FileJson className="h-4 w-4 text-yellow-600" />
    case 'md':
    case 'markdown':
      return <FileText className="h-4 w-4 text-gray-500" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <FileImage className="h-4 w-4 text-green-500" />
    case 'zip':
    case 'tar':
    case 'gz':
      return <FileArchive className="h-4 w-4 text-purple-500" />
    default:
      return <FileText className="h-4 w-4 text-gray-400" />
  }
}

interface FileTreeNodeProps {
  node: FileNode
  level: number
  selectedFile?: string
  onFileSelect: (file: FileNode) => void
  onFileRename?: (fileId: string, newName: string) => void
  onFileDelete?: (fileId: string) => void
}

function FileTreeNode({ 
  node, 
  level, 
  selectedFile, 
  onFileSelect, 
  onFileRename, 
  onFileDelete 
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(node.name)
  
  const isSelected = selectedFile === node.path
  const hasChildren = node.children && node.children.length > 0

  const handleToggle = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded)
    } else {
      onFileSelect(node)
    }
  }

  const handleRename = () => {
    if (onFileRename && newName !== node.name) {
      onFileRename(node.id, newName)
    }
    setIsRenaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setNewName(node.name)
      setIsRenaming(false)
    }
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "flex items-center space-x-1 py-1 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors",
          isSelected && "bg-primary/10 text-primary",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggle}
      >
        {node.type === 'folder' && (
          <button
            className="p-0.5 hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        
        {node.type === 'file' && <div className="w-4" />}
        
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {node.type === 'folder' ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )
          ) : (
            getFileIcon(node.name)
          )}
          
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate flex-1">{node.name}</span>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {node.type === 'folder' && isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children!.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                level={level + 1}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
                onFileRename={onFileRename}
                onFileDelete={onFileDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FileTree({ 
  files, 
  selectedFile, 
  onFileSelect, 
  onFileRename, 
  onFileDelete,
  className 
}: FileTreeProps) {
  return (
    <div className={cn("w-full h-full overflow-auto", className)}>
      <div className="p-2">
        {files.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files to display</p>
          </div>
        ) : (
          files.map((file) => (
            <FileTreeNode
              key={file.id}
              node={file}
              level={0}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              onFileRename={onFileRename}
              onFileDelete={onFileDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Utility function to convert flat file list to tree structure
export function buildFileTree(files: Array<{ path: string; content: string; type: string }>): FileNode[] {
  const tree: FileNode[] = []
  const pathMap = new Map<string, FileNode>()

  // Sort files by path to ensure proper order
  const sortedFiles = files.sort((a, b) => a.path.localeCompare(b.path))

  for (const file of sortedFiles) {
    const pathParts = file.path.split('/')
    let currentPath = ''
    let parentNode: FileNode | undefined

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part
      
      if (!pathMap.has(currentPath)) {
        const isFile = i === pathParts.length - 1
        const node: FileNode = {
          id: currentPath,
          name: part,
          type: isFile ? 'file' : 'folder',
          path: currentPath,
          children: isFile ? undefined : [],
          content: isFile ? file.content : undefined,
        }

        pathMap.set(currentPath, node)

        if (parentNode) {
          parentNode.children!.push(node)
        } else {
          tree.push(node)
        }
      }

      parentNode = pathMap.get(currentPath)
    }
  }

  return tree
}
