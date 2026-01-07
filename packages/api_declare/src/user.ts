export interface UserIden {
    id: string;
}

export interface UserCreaterUserVerify {
    challenge_text: string;
    challenge_darkmode: string;
    challenge_code: string;
    challenge_time: number;
}

export interface UserCreateUser {
    iden: string;
    name: string;
    email: string;
    avatar: string;
    password: string;
    verify: UserCreaterUserVerify;
}

export interface UserBeforeCreate {
    dark_mode: boolean;
    email: string;
}

export interface UserUpdateRequest {
    user: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    description?: string | null;
    bio?: string | null;
    user_profile_show?: string | null;
    old_password?: string | null;
    new_password?: string | null;
}

export interface LoginProp {
    user: string;
    password: string;
    long_token?: boolean | null;
}

export interface SidebarQuery {
    path: string;
}

export interface SidebarItem {
    title: string;
    url: string;
    show?: string | null;
    reg?: string | null;
    icon: string;
    number?: number | null;
}

export interface SimplyUser {
    node_id: number;
    avatar: string;
    name: string;
    iden: string;
}

export interface UserRaw {
    iden: string;
    name: string;
    email: string;
    avatar: string;
    password: string;
}

export interface UserUpdateProps {
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    description?: string | null;
    bio?: string | null;
    user_profile_show?: string | null;
}

export interface UserInfoResponse {
    is_login: boolean;
    user?: SimplyUser | null;
}

export interface SidebarResponse {
    is_login: boolean;
    user?: SimplyUser | null;
    sidebar?: SidebarItem[] | null;
}

export interface ProfileResponse {
    user: SimplyUser;
}