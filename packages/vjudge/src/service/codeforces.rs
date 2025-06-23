use headless_chrome::Browser;

use crate::service::VjudgeService;

pub struct CodeforcesVjudgeService {
    pub browser: Browser,
}

impl VjudgeService for CodeforcesVjudgeService  {
    fn login(&self) {
        let browser = &self.browser;
        let tab = browser.new_tab().unwrap();
        tab.navigate_to("https://codeforces.com");
        tab.wait_until_navigated().unwrap();
        tab.navigate_to("https://codeforces.com/enter").unwrap();
        tab.wait_until_navigated().unwrap();
        tab.wait_until_navigated().unwrap();
        tab.wait_until_navigated().unwrap();
        tab.wait_until_navigated().unwrap();
        tab.wait_until_navigated().unwrap();
        loop {
            tab.wait_for_element("[id=abc]").unwrap();
        };
        println!("{:?}", tab.get_content().unwrap_or_default());
    }
}
