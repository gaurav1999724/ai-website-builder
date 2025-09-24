'use client'

import { motion } from 'framer-motion'
import { Check, Loader2, Brain, Code, FileText, Zap, FolderOpen } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'

export interface LoadingStage {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'pending' | 'active' | 'completed' | 'error'
}

interface LoadingStagesProps {
  stages: LoadingStage[]
  currentStage: number
  progress: number
  error?: string
}

const stageIcons = {
  reading: <FileText className="h-5 w-5" />,
  thinking: <Brain className="h-5 w-5" />,
  generating: <Code className="h-5 w-5" />,
  optimizing: <Zap className="h-5 w-5" />,
  preparing: <FolderOpen className="h-5 w-5" />,
}

export function LoadingStages({ stages, currentStage, progress, error }: LoadingStagesProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4"
            >
              <Brain className="h-8 w-8 text-primary" />
            </motion.div>
            <h2 className="text-2xl font-bold">Generating Your Website</h2>
            <p className="text-muted-foreground">
              Our AI is working hard to create your perfect website
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
            >
              <p className="text-destructive font-medium">Generation Failed</p>
              <p className="text-destructive/80 text-sm mt-1">{error}</p>
            </motion.div>
          )}

          {/* Stages */}
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center space-x-4 p-4 rounded-lg transition-all duration-300 ${
                  stage.status === 'active'
                    ? 'bg-primary/5 border border-primary/20'
                    : stage.status === 'completed'
                    ? 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800'
                    : 'bg-muted/30'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {stage.status === 'completed' ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                    >
                      <Check className="h-4 w-4 text-white" />
                    </motion.div>
                  ) : stage.status === 'active' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"
                    >
                      <Loader2 className="h-4 w-4 text-white" />
                    </motion.div>
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      {stage.icon}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${
                    stage.status === 'active' ? 'text-primary' : 
                    stage.status === 'completed' ? 'text-green-700 dark:text-green-300' : 
                    'text-muted-foreground'
                  }`}>
                    {stage.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stage.description}
                  </p>
                </div>

                {/* Status Indicator */}
                {stage.status === 'active' && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 bg-primary rounded-full"
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
          >
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Pro Tip
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              The more specific your prompt, the better the results. Try including details about 
              colors, layout preferences, and specific features you want.
            </p>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  )
}

// Default stages for website generation
export const defaultStages: LoadingStage[] = [
  {
    id: 'reading',
    title: 'Reading Prompt',
    description: 'Analyzing your requirements and understanding the project scope',
    icon: stageIcons.reading,
    status: 'pending',
  },
  {
    id: 'thinking',
    title: 'AI Processing',
    description: 'Our AI is thinking about the best approach for your website',
    icon: stageIcons.thinking,
    status: 'pending',
  },
  {
    id: 'generating',
    title: 'Generating Code',
    description: 'Creating HTML, CSS, and JavaScript files for your website',
    icon: stageIcons.generating,
    status: 'pending',
  },
  {
    id: 'optimizing',
    title: 'Optimizing Code',
    description: 'Cleaning up code, adding best practices, and ensuring quality',
    icon: stageIcons.optimizing,
    status: 'pending',
  },
  {
    id: 'preparing',
    title: 'Preparing Project',
    description: 'Organizing files and getting everything ready for you',
    icon: stageIcons.preparing,
    status: 'pending',
  },
]
