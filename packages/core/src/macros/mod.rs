#[macro_export]
macro_rules! now_time {
    () => {
        chrono::offset::Utc::now().naive_utc()
    };
}

#[macro_export]
macro_rules! async_run {
    ($($body:tt)*) => {{
        let bt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
        bt.block_on(async {
            $($body)*
        })
    }};
}
