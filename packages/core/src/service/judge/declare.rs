use std::marker::PhantomData;
/*

解释：

Language 是语言选项。
CompileOptionService 是针对不同网站提供的服务。
传入的参数分为两种，一种是router。
*/

pub trait CompileOptionValue {
    fn value(&self) -> &'static str;
    fn show(&self) -> &'static str {
        self.value()
    }
}

pub trait CompileOption {
    fn valid(&self, value: &'static str) -> bool {
        false
    }
    fn export_compile_name(&self) -> &'static str; // --std(gcc choose version)
    fn export_show_name(&self) -> &'static str {
        self.export_compile_name() // default to compile name.
    }
    fn export_allowed_option(&self) -> Vec<Box<dyn CompileOptionValue>>; // allowed value.


    fn is_compile(&self) -> bool { true }
    fn is_router(&self) -> bool {
        !self.is_compile()
    }
    fn is_input(&self) -> bool { false }

}


pub trait Language {
    fn export_allow_compile_options(&self) -> Vec<Box<dyn CompileOption>>;
    fn export_name(&self) -> &'static str;

    fn export_compile_name(&self) -> &'static str;
}

pub struct LanguageChoiceOptionsInformation {
    pub name: &'static str,
    pub is_compile: bool,
    pub is_input: bool, // 是否允许键入值。
    pub allowed_option: Vec<&'static str>, // value.
}

pub struct LanguageChoiceInformation {
    pub name: &'static str,
    pub allow_option: Vec<LanguageChoiceOptionsInformation>,
}


pub struct ChoiceOption<L> {
    pub option_choices: Vec<(Box<dyn CompileOption>, Vec<Box<dyn CompileOptionValue>>)>,
    pub language: L,
}

pub trait CompileOptionService<L, R> where Self: Sized, L: Language {
    fn get_registered_language(&self) -> Vec<L>;

    fn export_all_allowed_language(&self) -> Vec<LanguageChoiceInformation> {
        let languages = self.get_registered_language();
        let mut res = Vec::new();
        for language in languages {
            let allowed_options = language.export_allow_compile_options();
            let mut option_info = Vec::new();
            for option in allowed_options {
                let allowed_values = option.export_allowed_option();
                let allowed_value_str: Vec<&'static str> = allowed_values.iter().map(|v| v.value()).collect();
                option_info.push(LanguageChoiceOptionsInformation {
                    name: option.export_compile_name(),
                    allowed_option: allowed_value_str,
                    is_compile: option.is_compile(),
                    is_input: option.is_input(),
                });
            }
            res.push(LanguageChoiceInformation {
                name: language.export_name(),
                allow_option: option_info,
            });
        }
        res
    }

    fn export_data(&self, choice: ChoiceOption<L>) -> R;
}

