export interface VjudgePlatformFieldInfo {
    id: string;
    name: string;
    type: string;
    placeholder: string;
}

export interface VjudgePlatformMethodInfo {
    name: string;
    description: string;
    stable: number;
    require_fields: VjudgePlatformFieldInfo[];
    tips?: string[];
    is_pwd?: boolean;
    payload_template: string;
}

export interface VjudgePlatformInfo {
    name: string;
    url: string;
    color: string;
    allow_method: VjudgePlatformMethodInfo[];
}

export const VJUDGE_PLATFORMS: VjudgePlatformInfo[] = [
    {
        name: "Codeforces",
        url: "codeforces.com",
        color: "#3b82f6",
        allow_method: [
            {
                name: "APIKEY",
                description: "使用 Codeforces API Key 进行绑定（推荐）",
                stable: 0,
                tips: ["https://codeforces.com/settings/api"],
                require_fields: [
                    {
                        id: "handle",
                        name: "用户名",
                        type: "text",
                        placeholder: "your_handle",
                    },
                    {
                        id: "api_key",
                        name: "API Key",
                        type: "text",
                        placeholder: "your_api_key",
                    },
                    {
                        id: "api_secret",
                        name: "API Secret",
                        type: "password",
                        placeholder: "your_api_secret",
                    },
                ],
                payload_template:
                    '{"method":"apikey","handle":"{{handle}}","auth":{"Token":"{{api_key}}:{{api_secret}}"}}',
            },
            {
                name: "Cookie",
                description: "使用 Cookie 进行绑定（推荐）",
                stable: 1,
                tips: ["请通过绑定教程，填入您的SESSIONID即可。"],
                require_fields: [
                    {
                        id: "handle",
                        name: "用户名",
                        type: "text",
                        placeholder: "your_handle",
                    },
                    {
                        id: "cookie",
                        name: "Cookie",
                        type: "text",
                        placeholder: "your_cookie（SESSIONID）",
                    },
                ],
                payload_template:
                    '{"method":"token","handle":"{{handle}}","auth":{"Token":"{{cookie}}"}}',
            },
            {
                name: "Password",
                description: "使用用户名和密码进行绑定",
                is_pwd: true,
                stable: 2,
                require_fields: [
                    {
                        id: "handle",
                        name: "用户名",
                        type: "text",
                        placeholder: "your_handle",
                    },
                    {
                        id: "password",
                        name: "密码",
                        type: "password",
                        placeholder: "your_password",
                    },
                ],
                payload_template:
                    '{"method":"password","handle":"{{handle}}","auth":{"Password":"{{password}}"}}',
            },
        ],
    },
    {
        name: "AtCoder",
        url: "atcoder.jp",
        color: "#22c55e",
        allow_method: [
            {
                name: "Trust",
                description: "信任绑定（无需凭据，仅用于公开数据同步）",
                stable: 1,
                require_fields: [
                    {
                        id: "handle",
                        name: "用户名",
                        type: "text",
                        placeholder: "your_handle",
                    },
                ],
                payload_template:
                    '{"method":"only","handle":"{{handle}}","auth":null}',
            },
            {
                name: "Cookie",
                description: "使用 Cookie 进行绑定",
                stable: 1,
                require_fields: [
                    {
                        id: "handle",
                        name: "用户名",
                        type: "text",
                        placeholder: "your_handle",
                    },
                    {
                        id: "cookie",
                        name: "Cookie",
                        type: "text",
                        placeholder: "your_cookie",
                    },
                ],
                payload_template:
                    '{"method":"token","handle":"{{handle}}","auth":{"Token":"{{cookie}}"}}',
            },
        ],
    },
    {
        name: "POJ",
        url: "poj.org",
        color: "#eab308",
        allow_method: [
            {
                name: "Password",
                description: "使用用户名和密码进行绑定",
                stable: 2,
                require_fields: [
                    {
                        id: "handle",
                        name: "用户名",
                        type: "text",
                        placeholder: "your_handle",
                    },
                    {
                        id: "password",
                        name: "密码",
                        type: "password",
                        placeholder: "your_password",
                    },
                ],
                payload_template:
                    '{"method":"password","handle":"{{handle}}","auth":{"Password":"{{password}}"}}',
            },
        ],
    },
];