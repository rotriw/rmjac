export interface ProblemModule {
  id: string;
  title: string;
  content: string;
  type: "background" | "description" | "input" | "output" | "sample" | "custom";
}

export interface SampleGroup {
  id: string;
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemData {
  id: string;
  problem_source: string;
  problem_iden: string;
  modules: ProblemModule[];
  sampleGroups: SampleGroup[];
}