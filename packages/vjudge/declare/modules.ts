import { VjudgeAuth } from "./node.ts";
import { UniversalSubmission } from "./submission.ts";
import { verifyMethod } from "./verified.ts";

export type VjudgeUserVerifiedFunctionName = `verified${verifyMethod}`;
export type VjudgeVerifiedFunction = (handle: string, context: VjudgeAuth) => Promise<boolean>;

export type VjudgeUserSyncListFunctionName = `syncList${verifyMethod}`;
export type VjudgeSyncListFunction = (handle: string, context: VjudgeAuth, from: number, count: number) => Promise<UniversalSubmission[]>;

export type VjudgeUserSyncOneFunctionName = `syncOne${verifyMethod}`;
export type VjudgeSyncOneFunction = (handle: string, context: VjudgeAuth, id: number, contest_id?: string) => Promise<UniversalSubmission>;

export type VjudgeUserSyncAllFunctionName = `syncAll${verifyMethod}`;
export type VjudgeSyncAllFunction = (handle: string, context: VjudgeAuth) => Promise<UniversalSubmission[]>;



export interface VjudgeUser 
    extends
    Record<VjudgeUserVerifiedFunctionName, VjudgeVerifiedFunction | undefined>,
    Record<VjudgeUserSyncListFunctionName, VjudgeSyncListFunction | undefined>,
    Record<VjudgeUserSyncOneFunctionName, VjudgeSyncOneFunction | undefined>,
    Record<VjudgeUserSyncAllFunctionName, VjudgeSyncAllFunction | undefined>
    {}