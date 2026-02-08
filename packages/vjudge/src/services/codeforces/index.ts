/**
 * Codeforces Platform Services
 * 将 Codeforces 平台的所有服务整合并导出
 */

import type { EdgeService } from "../../workflow/index.ts";

// 导入各个服务模块
import { getCodeforcesVerifyServices } from "./verify.ts";
import { getCoforcesQueryServices } from "./query.ts";
import { getCodeforcesSyncServices } from "./sync.ts";
import { getCodeforcesSubmitServices } from "./submit.ts";

/**
 * Codeforces 平台配置
 */
export const CODEFORCES_PLATFORM = {
  id: "codeforces",
  name: "Codeforces",
  url: "https://codeforces.com",
  features: ["verify", "query", "sync", "submit"],
  supportedLanguages: [
    { id: "43", name: "GNU GCC C11 5.1.0" },
    { id: "52", name: "Clang++17 Diagnostics" },
    { id: "50", name: "GNU G++14 6.4.0" },
    { id: "54", name: "GNU G++17 7.3.0" },
    { id: "61", name: "GNU G++17 9.2.0 (64 bit, msys 2)" },
    { id: "73", name: "GNU G++20 11.2.0 (64 bit, winlibs)" },
    { id: "89", name: "GNU G++20 13.2 (64 bit, winlibs)" },
    { id: "60", name: "Java 11.0.6" },
    { id: "74", name: "Java 17 64bit" },
    { id: "91", name: "Java 21 64bit" },
    { id: "36", name: "Python 2.7.18" },
    { id: "41", name: "Python 3.9.1" },
    { id: "70", name: "PyPy 3.9.10 (7.3.9, 64bit)" },
    { id: "87", name: "PyPy 3.10 (7.3.15, 64bit)" },
    { id: "31", name: "Kotlin 1.7.20" },
    { id: "83", name: "Kotlin 1.9.21" },
    { id: "55", name: "Node.js 12.16.3" },
    { id: "75", name: "Rust 1.58.1" },
    { id: "90", name: "Rust 1.75.0 (2021)" },
    { id: "9", name: "C# Mono 6.8" },
    { id: "79", name: "C# 8, .NET Core 3.1" },
    { id: "65", name: "C# 10, .NET SDK 6.0" },
    { id: "32", name: "Go 1.19.5" },
    { id: "28", name: "D DMD32 v2.101.0" },
    { id: "12", name: "Haskell GHC 8.10.1" },
    { id: "19", name: "OCaml 4.02.1" },
    { id: "3", name: "Delphi 7" },
    { id: "4", name: "Free Pascal 3.2.2" },
    { id: "51", name: "PascalABC.NET 3.8.3" },
    { id: "67", name: "Ruby 3.0.0" },
    { id: "20", name: "Scala 2.12.8" },
    { id: "34", name: "JavaScript V8 4.8.0" },
    { id: "48", name: "PHP 8.1.7" },
    { id: "2", name: "MS C++ 2017" },
  ],
};

/**
 * 获取 Codeforces 平台的所有 EdgeService
 */
export function getCodeforcesPlatformServices(): EdgeService[] {
  return [
    ...getCodeforcesVerifyServices(),
    ...getCoforcesQueryServices(),
    ...getCodeforcesSyncServices(),
    ...getCodeforcesSubmitServices(),
  ];
}

// 导出各个服务类（方便单独使用）
export * from "./verify.ts";
export * from "./query.ts";
export * from "./sync.ts";
export * from "./submit.ts";
