use std::ffi::OsStr;

use vjudge::service::VjudgeService;

#[test]
pub fn test_codeforces() {
    let option = headless_chrome::LaunchOptions {
        headless: false,
        args: vec![OsStr::new("--disable-blink-features=AutomationControlled")],
        ..Default::default()
    };
    let browser = headless_chrome::Browser::new(option).unwrap();
    let service = vjudge::service::codeforces::CodeforcesVjudgeService { browser };
    service.login();
}
