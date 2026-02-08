/**
 * AtCoder Platform Services
 * 将 AtCoder 平台的所有服务整合并导出
 */

import type { EdgeService } from "../../workflow/index.ts";

// 导入各个服务模块
import { getAtCoderVerifyServices } from "./verify.ts";
import { getAtCoderSyncServices } from "./sync.ts";
import { getAtCoderSubmitServices } from "./submit.ts";

/**
 * AtCoder 平台配置
 */
export const ATCODER_PLATFORM = {
  id: "atcoder",
  name: "AtCoder",
  url: "https://atcoder.jp",
  features: ["verify", "sync", "submit"],
  supportedLanguages: [
    { id: "4001", name: "C (GCC 9.2.1)" },
    { id: "4003", name: "C++ (GCC 9.2.1)" },
    { id: "4004", name: "C++ (Clang 10.0.0)" },
    { id: "4005", name: "Java (OpenJDK 11.0.6)" },
    { id: "4006", name: "Python (3.8.2)" },
    { id: "4007", name: "Bash (5.0.11)" },
    { id: "4010", name: "C# (.NET Core 3.1.201)" },
    { id: "4011", name: "C# (Mono 6.6.0.161)" },
    { id: "4013", name: "D (DMD 2.091.0)" },
    { id: "4014", name: "D (GDC 9.2.1)" },
    { id: "4015", name: "D (LDC 1.20.1)" },
    { id: "4016", name: "Fortran (GNU Fortran 9.2.1)" },
    { id: "4017", name: "Go (1.14.1)" },
    { id: "4018", name: "Haskell (GHC 8.8.3)" },
    { id: "4019", name: "JavaScript (Node.js 12.16.1)" },
    { id: "4020", name: "Julia (1.4.0)" },
    { id: "4021", name: "Kotlin (1.3.71)" },
    { id: "4023", name: "Nim (1.0.6)" },
    { id: "4024", name: "Objective-C (Clang 10.0.0)" },
    { id: "4025", name: "Common Lisp (SBCL 2.0.3)" },
    { id: "4026", name: "Perl (5.26.1)" },
    { id: "4027", name: "Raku (Rakudo 2020.02.1)" },
    { id: "4028", name: "PHP (7.4.4)" },
    { id: "4030", name: "PyPy3 (7.3.0)" },
    { id: "4031", name: "Prolog (SWI-Prolog 8.0.3)" },
    { id: "4032", name: "Python (2.7.18)" },
    { id: "4033", name: "Ruby (2.7.1)" },
    { id: "4034", name: "Rust (1.42.0)" },
    { id: "4035", name: "Scala (2.13.1)" },
    { id: "4036", name: "Java (OpenJDK 1.8.0)" },
    { id: "4041", name: "Swift (5.2.1)" },
    { id: "4042", name: "Text (cat 8.28)" },
    { id: "4043", name: "TypeScript (3.8)" },
    { id: "4044", name: "Visual Basic (.NET Core 3.1.101)" },
    { id: "4049", name: "OCaml (4.10.0)" },
    { id: "4050", name: "F# (.NET Core 3.1.201)" },
    { id: "4053", name: "Clojure (1.10.1.536)" },
    { id: "4054", name: "Crystal (0.33.0)" },
    { id: "4060", name: "Lua (LuaJIT 2.1.0)" },
    { id: "4062", name: "Pascal (FPC 3.0.4)" },
    { id: "4063", name: "Perl (5.26.1)" },
    { id: "4064", name: "PyPy2 (7.3.0)" },
  ],
};

/**
 * 获取 AtCoder 平台的所有 EdgeService
 */
export function getAtCoderPlatformServices(): EdgeService[] {
  return [
    ...getAtCoderVerifyServices(),
    ...getAtCoderSyncServices(),
    ...getAtCoderSubmitServices(),
  ];
}

// 导出各个服务类（方便单独使用）
export * from "./verify.ts";
export * from "./sync.ts";
export * from "./submit.ts";
