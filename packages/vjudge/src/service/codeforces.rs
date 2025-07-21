use headless_chrome::Browser;

use crate::service::VjudgeService;

pub struct CodeforcesVjudgeService {
    pub browser: Browser,
}

impl VjudgeService for CodeforcesVjudgeService {
    fn login(&self) {
    }
}
