export const CFSubmissionStatus = {
    "FAILED": "UnknownError",
    "OK": "Accepted",
    "PARTIAL": "Partial Accepted",
    "COMPILATION_ERROR": "Compile Error",
    "RUNTIME_ERROR": "Runtime Error",
    "WRONG_ANSWER": "Wrong Answer",
    "TIME_LIMIT_EXCEEDED": "Time Limit Exceeded",
    "MEMORY_LIMIT_EXCEEDED": "Memory Limit Exceeded",
    "IDLENESS_LIMIT_EXCEEDED": "Idleness Limit Exceeded",
    "SECURITY_VIOLATED": "Dangerous Code",
    "CRASHED": "Runtime Error",
    "INPUT_PREPARATION_CRASHED": "Runtime Error",
    "CHALLENGED": "Wrong Answer",
    "SKIPPED": "Skipped",
    "TESTING": "Waiting",
    "REJECTED": "UnknownError",
    "SUBMITTED": "Waiting",
}


export const convertCFSubmissionStatus = (status: string) =>  {
    return CFSubmissionStatus[status as keyof typeof CFSubmissionStatus] || "UnknownError";
}