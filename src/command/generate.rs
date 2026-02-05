//! router: generate
//! description: Generate TS File, You must need to enable export_ts_mode.
//! --path -p <path>, ts_rs::TS file will export at.


pub fn run(path: Option<String>) -> Option<()> {
    println!("In:{:?}", path);
    #[cfg(not(feature = "export_ts_type"))]
    {
        println!("export_ts_mode is not enabled, please enable export_ts_mode feature");
        return Some(());
    }
    #[cfg(feature = "export_ts_type")]
    {
        println!("Done.");
        // use macro_handler::export::generate_all;
        // generate_all!();
        return Some(());
    }
}
