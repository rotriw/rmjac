use serde::{Deserialize, Serialize};
use ts_rs::TS;
use crate::model::user::User;
use crate::service::save::Saved;

#[derive(Debug, Clone, Deserialize, Serialize, TS)]
#[ts(export)]
pub struct Sidebar {
    pub name: String,
    pub path: String,
    pub icon: String,
    pub active: bool,
}

impl Sidebar {
    pub fn new(name: &str, path: &str, icon: &str) -> Self {
        Self {
            name: name.to_string(),
            path: path.to_string(),
            icon: icon.to_string(),
            active: false,
        }
    }

    pub fn new_active(name: &str, path: &str, icon: &str) -> Self {
        Self {
            name: name.to_string(),
            path: path.to_string(),
            icon: icon.to_string(),
            active: true,
        }
    }
    pub fn active(&mut self) {
        self.active = true;
    }

    pub fn inactive(&mut self) {
        self.active = false;
    }
}


pub fn get_sidebar(user: Option<Saved<User>>, path: &str) -> Vec<Sidebar> {
    let mut paths = path.split("/").collect::<Vec<&str>>();
    let mut result = vec![
        Sidebar::new("主页", "", "Dock"),
    ];
    if user.is_some() {
        result.push(Sidebar::new("题库", "problem", "Book"));
        result.push(Sidebar::new("训练", "training", "Archive"));
        result.push(Sidebar::new("提交记录", "record", "History"));
    } else {
        result.push(Sidebar::new("题库", "problem", "Book"));
        result.push(Sidebar::new("训练", "training", "Archive"));
        result.push(Sidebar::new("登录/注册", "login", "LogIn"));
    }
    match paths[0] {
        "" => result[0].active(),
        "problem" => result[1].active(),
        "training" => result[2].active(),
        "record" => result[3].active(),
        _ => {}
    }
    if paths.len() > 1 && !paths[1].is_empty() {
        match paths[0] {
            "problem" => {
                result[1].inactive();
                result.push(Sidebar::new_active("题目详情", path, "File"));
            },
            "training" => {
                result[2].inactive();
                result.push(Sidebar::new_active("训练详情", path, "File"));
            },
            "record" => {
                result[3].inactive();
                result.push(Sidebar::new_active("提交详情", path, "File"));
            },
            "user" => {
                result.push(Sidebar::new_active("用户详情", path, "User"));
            },
            _ => {}
        }
    }
    return result;
}