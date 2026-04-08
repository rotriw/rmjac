import type { JudgeStatus } from "@rmjac/api-declare";
import type { RecordStatus } from "@/api-components/record/status-utils";

export function mapJudgeStatusToRecordStatus(status: JudgeStatus): RecordStatus {
  switch (status) {
    case "Accepted":
      return "Accepted";
    case "WrongAnswer":
      return "Wrong Answer";
    case "TimeLimitExceeded":
      return "Time Limit Exceeded";
    case "MemoryLimitExceeded":
      return "Memory Limit Exceeded";
    case "RuntimeError":
      return "Runtime Error";
    case "CompileError":
      return "Compile Error";
    case "PresentationError":
      return "Wrong Answer";
    case "Skipped":
      return "Skipped";
    case "RemoteJudgeServiceError":
      return "Remote Service Unknown Error";
    case "RemoteError":
      return "Remote Platform Unknown Error";
    case "Reject":
      return "Remote Platform Refused";
    case "Unknown":
    default:
      return "Unknown Error";
  }
}

export function normalizeProblemIden(iden: string) {
  return iden.replaceAll("problem", "").replace(/^\./, "");
}

export type Filters = {
  userId: string;
  problemIden: string;
  codeLength: string;
  status: string;
};

/** All JudgeStatus values for the status filter dropdown */
export const JUDGE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "Accepted", label: "Accepted" },
  { value: "WrongAnswer", label: "Wrong Answer" },
  { value: "TimeLimitExceeded", label: "Time Limit Exceeded" },
  { value: "MemoryLimitExceeded", label: "Memory Limit Exceeded" },
  { value: "RuntimeError", label: "Runtime Error" },
  { value: "CompileError", label: "Compile Error" },
  { value: "PresentationError", label: "Presentation Error" },
  { value: "Skipped", label: "Skipped" },
  { value: "RemoteJudgeServiceError", label: "Remote Service Error" },
  { value: "RemoteError", label: "Remote Error" },
  { value: "Reject", label: "Reject" },
  { value: "Unknown", label: "Unknown" },
];
