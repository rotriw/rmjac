"use client"

import { useState, useEffect, useRef } from "react"
import { TypstEditor } from "@/components/typst-editor"
import { TypstRenderer } from "@/components/typst-renderer"
import { ProblemData } from "@/app/problem/create/types"

interface IntegratedTypstEditorProps {
  problemData: ProblemData
  onChange: (problemData: ProblemData) => void
}

export function IntegratedTypstEditor({ 
  problemData, 
  onChange 
}: IntegratedTypstEditorProps) {
  const [content, setContent] = useState<string>("")
  const [taskId] = useState<string>("typst-integrated")
  const isUpdatingRef = useRef(false)

  const convertToIntegratedContent = (problem: ProblemData): string => {
    let text = ""
    
    text += `/* 题目来源: ${problem.problem_source || ""} */\n`
    text += `/* 题目标识: ${problem.problem_iden || ""} */\n\n`
    
    problem.modules.forEach((module) => {
      if (module.content.trim()) {
        text += `== ${module.title}\n\n${module.content}\n\n`
      }
    })
    
    if (problem.sampleGroups && problem.sampleGroups.length > 0) {
      text += `== 样例\n\n`
      problem.sampleGroups.forEach((sample, index) => {
        text += `=== 样例 ${index + 1}\n\n`
        if (sample.input.trim()) {
          text += `*输入*\n\n\`\`\`\n${sample.input}\n\`\`\`\n\n`
        }
        if (sample.output.trim()) {
          text += `*输出*\n\n\`\`\`\n${sample.output}\n\`\`\`\n\n`
        }
        if (sample.explanation && sample.explanation.trim()) {
          text += `*说明*\n\n${sample.explanation}\n\n`
        }
      })
    }
    
    return text
  }

  useEffect(() => {
    if (!isUpdatingRef.current) {
      const text = convertToIntegratedContent(problemData)
      setContent(text)
    }
    isUpdatingRef.current = false
  }, [problemData])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    isUpdatingRef.current = true
    
    let problemSource = problemData.problem_source
    let problemIden = problemData.problem_iden
    
    const lines = newContent.split('\n')
    const moduleContents: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.startsWith("/* 题目来源:")) {
        problemSource = line.substring("/* 题目来源: ".length, line.length - 2).trim()
      } else if (line.startsWith("/* 题目标识:")) {
        problemIden = line.substring("/* 题目标识: ".length, line.length - 2).trim()
      } else if (line.startsWith("== ") || line.startsWith("=== ")) {
        break
      } else if (!line.startsWith("/*") && !line.startsWith("*/") && !line.startsWith("=")) {
        moduleContents.push(line)
      }
    }
    
    if (problemData.modules.length > 0) {
      const updatedProblem = {
        ...problemData,
        problem_source: problemSource,
        problem_iden: problemIden,
        modules: problemData.modules.map((module, index) => {
          if (index === 0) {
            return { ...module, content: moduleContents.join('\n').trim() }
          }
          return module
        })
      }
      onChange(updatedProblem)
    }
  }

  useEffect(() => {
    // Preview rendering is handled locally by `TypstRenderer`.
  }, [taskId, content])

  useEffect(() => {
    // Preview rendering is handled locally by `TypstRenderer`.
    return
  }, [content, taskId])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TypstEditor
        value={content}
        onChange={handleContentChange}
        height="500px"
        onRender={() => {}}
      />
      <div 
        className="border rounded-md p-4 bg-white min-h-[500px] overflow-auto"
        style={{ fontSize: '20px', lineHeight: '1.6' }}
      >
        <TypstRenderer content={content} />
      </div>
    </div>
  )
}