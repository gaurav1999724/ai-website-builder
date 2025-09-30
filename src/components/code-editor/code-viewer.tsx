'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileTree, buildFileTree, FileNode } from './file-tree'
import MonacoEditor from '@monaco-editor/react'
import { 
  Code, 
  Eye, 
  Download, 
  ExternalLink, 
  FileText,
  Maximize2,
  Minimize2,
  Save
} from 'lucide-react'
import { toast } from 'sonner'

interface ProjectFile {
  id: string
  path: string
  content: string
  type: string
  size: number
}

interface CodeViewerProps {
  files: ProjectFile[]
  projectId?: string
  onFileUpdate?: (fileId: string, content: string) => void
  onFileSave?: (fileId: string, content: string) => void
  className?: string
}

export function CodeViewer({ 
  files, 
  projectId, 
  onFileUpdate, 
  onFileSave,
  className 
}: CodeViewerProps) {
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [activeTab, setActiveTab] = useState<'files' | 'preview'>('files')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (files.length > 0) {
      const tree = buildFileTree(files.map(f => ({
        path: f.path,
        content: f.content,
        type: f.type
      })))
      setFileTree(tree)
      
      // Select first file if none selected
      if (!selectedFile) {
        const firstFile = files.find(f => f.type !== 'folder')
        if (firstFile) {
          setSelectedFile(firstFile)
        }
      }
    }
  }, [files, selectedFile])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        handleFileSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedFile])

  const handleFileSelect = (node: FileNode) => {
    if (node.type === 'file') {
      const file = files.find(f => f.path === node.path)
      if (file) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileContentChange = (content: string) => {
    if (selectedFile && onFileUpdate) {
      onFileUpdate(selectedFile.id, content)
    }
  }

  const handleFileSave = () => {
    if (selectedFile && onFileSave) {
      onFileSave(selectedFile.id, selectedFile.content)
      toast.success('File saved successfully')
    }
  }

  const handlePreview = () => {
    if (selectedFile?.type === 'HTML') {
      // Open preview in new tab
      const blob = new Blob([selectedFile.content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } else {
      setActiveTab('preview')
    }
  }

  const handleDownloadProject = async () => {
    try {
      // This would typically call an API to generate a ZIP file
      toast.info('Download feature coming soon!')
    } catch (error) {
      toast.error('Failed to download project')
    }
  }

  const getLanguageFromType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'HTML': 'html',
      'CSS': 'css',
      'JAVASCRIPT': 'javascript',
      'TYPESCRIPT': 'typescript',
      'JSON': 'json',
      'MARKDOWN': 'markdown',
    }
    return typeMap[type] || 'plaintext'
  }

  if (files.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files to display</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "w-full h-full",
        isFullscreen ? "fixed inset-0 z-50 bg-background" : undefined,
        className
      )}
    >
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Code className="h-5 w-5" />
              <span>Code Editor</span>
              {selectedFile && (
                <Badge variant="secondary" className="ml-2">
                  {selectedFile.type}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {selectedFile && onFileSave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFileSave}
                  title="Save file (Ctrl+S)"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadProject}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'files' | 'preview')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="files" className="flex items-center space-x-2">
                <Code className="h-4 w-4" />
                <span>Files</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="h-full mt-0">
              <div className="flex h-full">
                {/* File Tree Sidebar */}
                <div className="w-1/3 border-r bg-muted/20">
                  <div className="p-3 border-b">
                    <h3 className="font-medium text-sm">Project Files</h3>
                    <p className="text-xs text-muted-foreground">
                      {files.length} files
                    </p>
                  </div>
                  <FileTree
                    files={fileTree}
                    selectedFile={selectedFile?.path}
                    onFileSelect={handleFileSelect}
                    className="h-full"
                  />
                </div>

                {/* Code Editor */}
                <div className="flex-1">
                  {selectedFile ? (
                    <MonacoEditor
                      height="100%"
                      value={selectedFile.content}
                      language={getLanguageFromType(selectedFile.type)}
                      theme="vs-dark"
                      path={selectedFile.path}
                      loading={<div className="flex items-center justify-center h-full text-muted-foreground">Loading editor...</div>}
                      options={{
                        automaticLayout: true,
                        acceptSuggestionOnCommitCharacter: true,
                        acceptSuggestionOnEnter: "on",
                        accessibilitySupport: "auto",
                        accessibilityPageSize: 10,
                        ariaLabel: `Code editor for ${selectedFile.path}`,
                        ariaRequired: false,
                        screenReaderAnnounceInlineSuggestion: true,
                        autoClosingBrackets: "languageDefined",
                        autoClosingComments: "languageDefined",
                        autoClosingDelete: "auto",
                        autoClosingOvertype: "auto",
                        autoClosingQuotes: "languageDefined",
                        autoIndent: "full",
                        autoSurround: "languageDefined",
                        bracketPairColorization: {
                          enabled: true,
                          independentColorPoolPerBracketType: false,
                        },
                        stickyTabStops: false,
                        codeLens: true,
                        colorDecorators: true,
                        colorDecoratorsActivatedOn: "clickAndHover",
                        colorDecoratorsLimit: 500,
                        comments: {
                          insertSpace: true,
                          ignoreEmptyLines: true,
                        },
                        cursorBlinking: "blink",
                        cursorSmoothCaretAnimation: "off",
                        cursorStyle: "line",
                        dragAndDrop: true,
                        emptySelectionClipboard: true,
                        dropIntoEditor: {
                          enabled: true,
                          showDropSelector: "afterDrop",
                        },
                        stickyScroll: {
                          enabled: true,
                          maxLineCount: 5,
                          defaultModel: "outlineModel",
                          scrollWithEditor: true,
                        },
                        experimentalWhitespaceRendering: "svg",
                        fastScrollSensitivity: 5,
                        find: {
                          cursorMoveOnType: true,
                          seedSearchStringFromSelection: "always",
                          autoFindInSelection: "never",
                          addExtraSpaceOnTop: true,
                          loop: true,
                        },
                        folding: true,
                        foldingStrategy: "auto",
                        foldingHighlight: true,
                        fontFamily: "Consolas, 'Courier New', monospace",
                        fontSize: 14,
                        fontWeight: "normal",
                        glyphMargin: true,
                        gotoLocation: {
                          multipleDefinitions: "peek",
                          multipleTypeDefinitions: "peek",
                          multipleDeclarations: "peek",
                          multipleImplementations: "peek",
                          multipleReferences: "peek",
                          alternativeDefinitionCommand: "editor.action.goToReferences",
                          alternativeTypeDefinitionCommand: "editor.action.goToReferences",
                          alternativeDeclarationCommand: "editor.action.goToReferences",
                        },
                        hover: {
                          enabled: true,
                          delay: 300,
                          sticky: true,
                          hidingDelay: 300,
                          above: true,
                        },
                        lineDecorationsWidth: 10,
                        lineNumbers: "on",
                        lineNumbersMinChars: 5,
                        links: true,
                        matchBrackets: "always",
                        minimap: {
                          enabled: true,
                          size: "proportional",
                          side: "right",
                          showSlider: "mouseover",
                          scale: 1,
                          renderCharacters: true,
                          maxColumn: 120,
                          showRegionSectionHeaders: true,
                          showMarkSectionHeaders: true,
                          sectionHeaderFontSize: 9,
                          sectionHeaderLetterSpacing: 1,
                        },
                        mouseStyle: "text",
                        multiCursorMergeOverlapping: true,
                        multiCursorModifier: "alt",
                        multiCursorPaste: "spread",
                        multiCursorLimit: 10000,
                        occurrencesHighlight: "singleFile",
                        overviewRulerBorder: true,
                        overviewRulerLanes: 2,
                        parameterHints: {
                          enabled: true,
                          cycle: true,
                        },
                        peekWidgetDefaultFocus: "tree",
                        quickSuggestions: {
                          other: "on",
                          comments: "off",
                          strings: "off",
                        },
                        quickSuggestionsDelay: 10,
                        readOnly: false,
                        renderControlCharacters: true,
                        renderFinalNewline: "on",
                        renderLineHighlight: "line",
                        renderValidationDecorations: "editable",
                        renderWhitespace: "selection",
                        revealHorizontalRightPadding: 15,
                        roundedSelection: true,
                        scrollbar: {
                          vertical: "auto",
                          horizontal: "auto",
                          verticalScrollbarSize: 14,
                          horizontalScrollbarSize: 12,
                        },
                        scrollBeyondLastLine: true,
                        selectionClipboard: true,
                        selectionHighlight: true,
                        selectOnLineNumbers: true,
                        showFoldingControls: "mouseover",
                        showUnused: true,
                        showDeprecated: true,
                        inlayHints: {
                          enabled: "on",
                          fontSize: 0,
                          fontFamily: "",
                          padding: false,
                        },
                        snippetSuggestions: "inline",
                        smoothScrolling: false,
                        suggest: {
                          insertMode: "insert",
                          filterGraceful: true,
                          showIcons: true,
                          showInlineDetails: true,
                          showMethods: true,
                          showFunctions: true,
                          showClasses: true,
                          showVariables: true,
                          showModules: true,
                          showProperties: true,
                          showEvents: true,
                          showOperators: true,
                          showValues: true,
                          showEnums: true,
                          showEnumMembers: true,
                          showKeywords: true,
                          showSnippets: true,
                        },
                        inlineSuggest: {
                          enabled: true,
                          showToolbar: "onHover",
                          suppressSuggestions: false,
                          fontFamily: "default",
                        },
                        wordWrap: "off",
                        wordWrapColumn: 80,
                      }}
                      onChange={(value) => {
                        if (value !== undefined) {
                          handleFileContentChange(value)
                        }
                      }}
                      onMount={(editor) => {
                        // Add Ctrl+S shortcut for save
                        editor.addCommand(1 | 49, () => {
                          handleFileSave()
                        })
                        
                        // Set accessibility attributes
                        const editorElement = editor.getDomNode()
                        if (editorElement) {
                          editorElement.setAttribute('id', `monaco-editor-${selectedFile.id}`)
                          editorElement.setAttribute('name', `monaco-editor-${selectedFile.path}`)
                          editorElement.setAttribute('role', 'textbox')
                          editorElement.setAttribute('aria-label', `Code editor for ${selectedFile.path}`)
                          editorElement.setAttribute('aria-multiline', 'true')
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a file to view its contents</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="h-full mt-0">
              <div className="h-full border rounded-lg overflow-hidden">
                {selectedFile?.type === 'HTML' ? (
                  <iframe
                    srcDoc={selectedFile.content}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation-by-user-activation"
                    title="Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select an HTML file to preview</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}