import { ArchiveIcon, BugIcon, CheckCheckIcon, CheckIcon, ClockAlertIcon, ClockIcon, DatabaseIcon, FileQuestion, MailQuestionIcon, MessageCircleQuestionIcon, MonitorOffIcon, Octagon, OctagonAlert, PenOffIcon, Trash, XIcon, ChevronLastIcon } from "lucide-react";
import { oklch2hex } from 'colorizr';

export type RecordStatus = "Accepted" 
| "Wrong Answer" 
| "Time Limit Exceeded"
| "Memory Limit Exceeded"
| "Output Limit Exceeded"
| "Idleness Limit Exceeded"
| "Runtime Error"
| "Compile Error"
| "Dangerous Code"
| "Remote Service Unknown Error"
| "Sandbox Error"
| "Remote Platform Refused"
| "Remote Platform Connection Failed"
| "Remote Platform Unknown Error"
| "Waiting"
| "Unknown Error"
| "Deleted"
| "OnlyArchived"
| "NotFound"
| "Skipped"
| "Partial Accepted";

export interface RecordNode {
    node_id: number
    public: {
        record_order: number
        record_score: number
        record_platform: string
        record_status: RecordStatus
        record_message: string
        record_time: string
        record_update_time: string
        code: string | null
        code_language: string | null
        record_url: string | null
    }
    private: {
        code: string
        code_language: string
    }
}

export interface SubtaskUserRecord {
    time: number
    memory: number
    status: RecordStatus
    score: number
    subtask_status: SubtaskUserRecord[]
}

export const RECORD_STATUS_COLOR_MAP: Record<RecordStatus, string> = {
  "Accepted": oklch2hex([0.7, 0.1, 140]),
  "Wrong Answer": oklch2hex([0.7, 0.1, 20]),
  "Time Limit Exceeded": oklch2hex([0.4, 0.1, 245]),
  "Memory Limit Exceeded": oklch2hex([0.4, 0.1, 260]),
  "Dangerous Code": oklch2hex([0.4, 0.3, 20]),
  "Compile Error": oklch2hex([0.7, 0.1, 80]),
  "Idleness Limit Exceeded": oklch2hex([0.4, 0.1, 30]),
  "NotFound": oklch2hex([0.7, 0.1, 320]),
  "Remote Platform Connection Failed": oklch2hex([0.4, 0.1, 260]),
  "Remote Platform Refused": oklch2hex([0.4, 0.1, 20]),
  "Remote Platform Unknown Error": oklch2hex([0.4, 0.1, 30]),
  "Remote Service Unknown Error": oklch2hex([0.4, 0.1, 30]),
  "Runtime Error": oklch2hex([0.4, 0.1, 80]),
  "Output Limit Exceeded": oklch2hex([0.4, 0.1, 245]),
  "Waiting": oklch2hex([0.7, 0.1, 270]),
  "Unknown Error": oklch2hex([0.4, 0.1, 20]),
  "Deleted": oklch2hex([0.3, 0.1, 20]),
  "OnlyArchived": oklch2hex([0.3, 0.1, 30]),
  "Skipped": oklch2hex([0.7, 0.01, 140]),
  "Partial Accepted": oklch2hex([0.6, 0.1, 140]),
  "Sandbox Error": oklch2hex([0.4, 0.1, 20]),
}

export const RECORD_STATUS_COLOR_MAP_INTER: Record<RecordStatus, string> = {
  "Accepted": oklch2hex([0.9, 0.1, 140]),
  "Wrong Answer": oklch2hex([0.9, 0.1, 20]),
  "Time Limit Exceeded": oklch2hex([0.9, 0.1, 245]),
  "Memory Limit Exceeded": oklch2hex([0.9, 0.1, 260]),
  "Dangerous Code": oklch2hex([0.9, 0.1, 20]),
  "Compile Error": oklch2hex([0.9, 0.1, 80]),
  "Idleness Limit Exceeded": oklch2hex([0.9, 0.1, 30]),
  "NotFound": oklch2hex([0.9, 0.1, 320]),
  "Remote Platform Connection Failed": oklch2hex([0.9, 0.1, 260]),
  "Remote Platform Refused": oklch2hex([0.9, 0.1, 20]),
  "Remote Platform Unknown Error": oklch2hex([0.9, 0.1, 30]),
  "Remote Service Unknown Error": oklch2hex([0.9, 0.1, 30]),
  "Runtime Error": oklch2hex([0.9, 0.1, 320]),
  "Output Limit Exceeded": oklch2hex([0.9, 0.1, 245]),
  "Waiting": oklch2hex([0.99, 0.1, 270]),
  "Unknown Error": oklch2hex([0.9, 0.1, 20]),
  "Deleted": oklch2hex([0.9, 0.1, 20]),
  "OnlyArchived": oklch2hex([0.9, 0.1, 30]),
  "Skipped": oklch2hex([0.9, 0.01, 140]),
  "Partial Accepted": oklch2hex([0.9, 0.1, 140]),
  "Sandbox Error": oklch2hex([0.9, 0.1, 20]),
}

export const RECORD_STATUS_ICON: Record<RecordStatus, any> = {
  "Accepted": CheckIcon,
  "Wrong Answer": XIcon,
  "Time Limit Exceeded": ClockAlertIcon,
  "Memory Limit Exceeded": DatabaseIcon,
  "Dangerous Code": OctagonAlert,
  "Compile Error": BugIcon,
  "Idleness Limit Exceeded": PenOffIcon,
  "NotFound": MailQuestionIcon,
  "Remote Platform Connection Failed": MonitorOffIcon,
  "Remote Platform Refused": MonitorOffIcon,
  "Remote Platform Unknown Error": MonitorOffIcon,
  "Remote Service Unknown Error": MessageCircleQuestionIcon,
  "Runtime Error": BugIcon,
  "Output Limit Exceeded": FileQuestion,
  "Waiting": ClockIcon,
  "Unknown Error": MessageCircleQuestionIcon,
  "Deleted": Trash,
  "OnlyArchived": ArchiveIcon,
  "Skipped": ChevronLastIcon,
  "Partial Accepted": CheckCheckIcon,
  "Sandbox Error": Octagon,
}

export function Icond({status, size, animate, className}: {status: RecordStatus, size?: number, animate?: boolean, className?: string}) {
  const Icons = RECORD_STATUS_ICON[status];
  // Convert custom size number (e.g. 5) to pixels if Lucide expects that, 
  // or use Tailwind size classes if passing className.
  // The user previously used `size-{size}` which works if using Tailwind JIT with dynamic safe-listing 
  // OR if they have safelisted size-1, size-2... size-5 etc.
  // Assuming they rely on Tailwind classes.
  
  // Note: Lucide icons accept `size` prop as number (px) or string.
  // If `size` is passed, we can pass it directly to Lucide if intended as pixels,
  // OR map it to className "w-X h-X".
  // Looking at user code `<Icond size={5} ... />`.
  // size-5 in Tailwind is 1.25rem (20px).
  // If we pass size={5} to Lucide, it renders 5px wide icon (very small).
  // So likely the user relied on `size-${size}` class name in previous version.
  
  return <Icons
    className={`inline-block mr-1 ${size ? `size-${size}` : 'size-5'} ${animate ? 'animate-path-draw' : ''} ${className || ''}`} 
  />
}
