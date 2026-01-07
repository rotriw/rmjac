export interface CreateProps {
    iden: string;
    title: string;
    description_public: string;
    description_private: string;
    start_time: string;
    end_time: string;
    training_type: string;
    problem_list: TrainingList;
    write_perm_user: number[];
    read_perm_user: number[];
}

export interface TrainingList {
    node_id?: number | null;
    description: string;
    own_problem: TrainingProblem[];
}

export type TrainingProblem = 
    | { ProblemIden: [number, string] }
    | { ProblemTraining: TrainingList }
    | { ProblemPresetTraining: [number, string] }
    | { ExistTraining: [number, string] };

export interface TrainingListStatus {
    total_task: number;
    completed_task: number;
    tried_task: number;
    total_score: number;
    data: Record<number, string>;
}

export interface AddProblemToListRequest {
    list_node_id: number;
    problems: string[];
}

export interface AddProblemListRequest {
    list_node_id: number;
    problem_list: TrainingList;
}

export interface ModifyListDescriptionRequest {
    list_node_id: number;
    description_public: string;
    description_private: string;
}

export interface RemoveProblemRequest {
    list_node_id: number;
    delete_node_id: number;
}

export interface UpdateOrderRequest {
    list_node_id: number;
    orders: [number, number][];
}

export interface TrainingNodePublic {
    name: string;
    iden: string;
    description: string;
    start_time: string;
    end_time: string;
    training_type: string;
}

export interface TrainingNodePrivate {
    description: string;
}

export interface TrainingNode {
    node_id: number;
    public: TrainingNodePublic;
    private: TrainingNodePrivate;
}

export interface Training {
    training_node: TrainingNode;
    problem_list: TrainingList;
}

export interface TrainingProblemNodePublic {
    description: string;
}

export interface TrainingProblemNodePrivate {}

export interface TrainingProblemNode {
    node_id: number;
    public: TrainingProblemNodePublic;
    private: TrainingProblemNodePrivate;
}

export interface TrainingAddProblemResponse {
    message: string;
    successful_data?: [number, number][];
}

export interface TrainingAddListResponse {
    message: string;
    successful_data?: TrainingProblemNode;
}

export interface TrainingMessageResponse {
    message: string;
    status?: string;
}