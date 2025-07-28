use core::{async_run, model::user::create_default_user};

#[test]
pub fn test_create_user() {
    let conn = std::env::var("DB").unwrap();
    async_run! {
        let db = sea_orm::Database::connect(conn).await.unwrap();
        for i in 1..=20000 {
            let _ = create_default_user(&db, format!("test_user_{i}").as_str(), format!("test_user_{i}").as_str(), format!("test_user_{i}@126.com").as_str(), format!("example.com/a.png").as_str(), "123456").await;
        }
    }
}
