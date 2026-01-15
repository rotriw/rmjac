use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;

/// PermValue trait - 所有权限枚举必须实现的基础 trait
pub trait PermValue:
    Sized + Clone + Into<i64> + PartialEq + Serialize + for<'de> Deserialize<'de> + ts_rs::TS
{
}

/// Perm 结构体 - 泛型权限容器
/// 序列化时只序列化 value，反序列化时需要使用 PermImport
#[derive(Clone, Debug, PartialEq)]
pub struct Perm<V> {
    value: i64,
    choiced_perm: Vec<V>,
}

// 手动实现 Serialize
impl<V: PermValue> Serialize for Perm<V> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("Perm", 2)?;
        state.serialize_field("value", &self.value)?;
        state.serialize_field("choiced_perm", &self.choiced_perm)?;
        state.end()
    }
}

// 手动实现 Deserialize
impl<'de, V: PermValue> Deserialize<'de> for Perm<V> {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::{MapAccess, Visitor};
        use std::fmt;
        use std::marker::PhantomData;

        struct PermVisitor<V>(PhantomData<V>);

        impl<'de, V: PermValue> Visitor<'de> for PermVisitor<V> {
            type Value = Perm<V>;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("struct Perm")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Perm<V>, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut value = None;
                let mut choiced_perm = None;

                while let Some(key) = map.next_key::<String>()? {
                    match key.as_str() {
                        "value" => {
                            value = Some(map.next_value()?);
                        }
                        "choiced_perm" => {
                            choiced_perm = Some(map.next_value()?);
                        }
                        _ => {
                            let _ = map.next_value::<serde::de::IgnoredAny>()?;
                        }
                    }
                }

                Ok(Perm {
                    value: value.unwrap_or(0),
                    choiced_perm: choiced_perm.unwrap_or_default(),
                })
            }
        }

        deserializer.deserialize_map(PermVisitor(PhantomData))
    }
}

// 手动实现 TS trait
impl<V: PermValue> ts_rs::TS for Perm<V> {
    type WithoutGenerics = Self;
    type OptionInnerType = Self;

    fn name() -> String {
        format!("Perm<{}>", V::name())
    }
    fn decl() -> String {
        format!(
            "interface {} {{ value: number; choiced_perm: {}[]; }}",
            Self::name(),
            V::name()
        )
    }
    fn decl_concrete() -> String {
        Self::decl()
    }
    fn inline() -> String {
        Self::name()
    }
    fn inline_flattened() -> String {
        Self::inline()
    }
}

impl<V: PermValue> Perm<V> {
    /// 获取权限值
    pub fn get_value(&self) -> i64 {
        self.value
    }

    /// 获取已选权限列表
    pub fn get_choiced_perm(&self) -> &Vec<V> {
        &self.choiced_perm
    }
}

impl<V: PermValue> From<Perm<V>> for i64 {
    fn from(v: Perm<V>) -> i64 {
        v.value
    }
}

impl<V: PermValue> Default for Perm<V> {
    fn default() -> Self {
        Self {
            value: 0,
            choiced_perm: Vec::new(),
        }
    }
}

/// PermExport trait - 导出权限值
pub trait PermExport {
    fn export_perm_value(&self) -> i64;
}

impl<V: PermValue> PermExport for Perm<V> {
    fn export_perm_value(&self) -> i64 {
        self.value
    }
}

/// PermImport trait - 从值或权限列表导入
pub trait PermImport<V: PermValue> {
    fn import_from_value(value: i64) -> Self;
    fn import_from_perms(perms: Vec<V>) -> Self;
}

impl<V: PermValue + IntoEnumIterator> PermImport<V> for Perm<V> {
    fn import_from_value(value: i64) -> Self {
        let mut new_value = 0i64;
        let mut choice_perm = Vec::new();
        for nv in V::iter() {
            let nvd: i64 = nv.clone().into();
            if nvd & value != 0 {
                new_value |= nvd;
                choice_perm.push(nv);
            }
        }
        Self {
            value: new_value,
            choiced_perm: choice_perm,
        }
    }

    fn import_from_perms(perms: Vec<V>) -> Self {
        let mut value = 0i64;
        for perm in perms.iter() {
            let perm_val: i64 = perm.clone().into();
            value |= perm_val;
        }
        Self {
            value,
            choiced_perm: perms,
        }
    }
}

/// PermAction trait - 权限操作（添加、删除、检查）
pub trait PermAction<V: PermValue> {
    fn add_perm(&self, perm: V) -> Self;
    fn del_perm(&self, perm: V) -> Self;
    fn check_perm(&self, perm: V) -> bool;
}

impl<V: PermValue> PermAction<V> for Perm<V> {
    fn add_perm(&self, perm: V) -> Self {
        let perm_val: i64 = perm.clone().into();
        let new_value = self.value | perm_val;
        let mut new_choice_perm = self.choiced_perm.clone();
        new_choice_perm.push(perm);
        Self {
            value: new_value,
            choiced_perm: new_choice_perm,
        }
    }

    fn del_perm(&self, perm: V) -> Self {
        let perm_val: i64 = perm.clone().into();
        let new_value = self.value & !perm_val;
        let new_choice_perm = self
            .choiced_perm
            .clone()
            .into_iter()
            .filter(|p| {
                let p_val: i64 = p.clone().into();
                p_val != perm_val
            })
            .collect();
        Self {
            value: new_value,
            choiced_perm: new_choice_perm,
        }
    }

    fn check_perm(&self, perm: V) -> bool {
        let perm_val: i64 = perm.into();
        self.value & perm_val != 0
    }
}