pub fn create_default_user(iden: &str, name: &str, email: &str, avatar: &str, password: &str) -> UserNode {
    let node_id = crate::node::new_node_id();
    let node_iden = format!("user_{}", iden);
    let creation_time = chrono::Utc::now().timestamp_millis();
    let creation_order = node_id;
    let last_login_time = chrono::Utc::now().to_rfc3339();
    let avatar = avatar.to_string();
    let public = UserNodePublic {
        name: name.to_string(),
        email: email.to_string(),
        creation_time,
        creation_order,
        last_login_time,
        avatar: avatar.clone(),
        description: String::new(),
    };
    let private = UserNodePrivate {
        password: password.to_string(),
    };
    UserNode {
        node_id,
        node_iden,
        public,
        private,
    }
}