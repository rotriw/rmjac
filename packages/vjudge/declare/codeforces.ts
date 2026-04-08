import { JudgeStatus } from "@rmjac/api-declare";

export const CFSubmissionStatus: Record<string, JudgeStatus | null> = {
    "FAILED": "WrongAnswer",
    "OK": "Accepted",
    "PARTIAL": "WrongAnswer",
    "COMPILATION_ERROR": "CompileError",
    "RUNTIME_ERROR": "RuntimeError",
    "WRONG_ANSWER": "WrongAnswer",
    "TIME_LIMIT_EXCEEDED": "TimeLimitExceeded",
    "MEMORY_LIMIT_EXCEEDED": "MemoryLimitExceeded",
    "IDLENESS_LIMIT_EXCEEDED": "Unknown",
    "SECURITY_VIOLATED": "Reject",
    "CRASHED": "RuntimeError",
    "INPUT_PREPARATION_CRASHED": "PresentationError",
    "CHALLENGED": "Unknown",
    "SKIPPED": "Skipped",
    "TESTING": "Reject",
    "REJECTED": "Reject",
    "SUBMITTED": "Unknown",
}


export const convertCFSubmissionStatus = (status: string): JudgeStatus =>  {
    return CFSubmissionStatus[status as keyof typeof CFSubmissionStatus] || "Unknown";
}