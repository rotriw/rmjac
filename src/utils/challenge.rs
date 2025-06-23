use core::utils::encrypt::encode_password;

use captcha_rs::CaptchaBuilder;
use chrono::NaiveDateTime;

pub fn gen_captcha(dark_mode: bool) -> (String, String) {
    let captcha = CaptchaBuilder::new()
        .length(5)
        .width(130)
        .height(40)
        .dark_mode(dark_mode)
        .complexity(1)
        .compression(40)
        .build();
    (captcha.text.clone(), captcha.to_base64())
}

pub fn gen_verify_captcha(captcha: &str, email: &str, time: &NaiveDateTime, code: &str, dark_mode: bool) -> String {
    encode_password(&format!(
        "{}@{}@{}@{}@{}",
        captcha,
        email,
        time.and_utc().timestamp_millis(),
        code,
        dark_mode
    ))
}

pub fn verify_captcha(
    captcha: &str,
    email: &str,
    time: i64,
    code: &str,
    dark_mode: bool,
    verify_code: &str,
) -> bool {
    let expected_code = encode_password(&format!("{}@{}@{}@{}@{}", captcha, email, time, code, dark_mode));
    expected_code == verify_code
}