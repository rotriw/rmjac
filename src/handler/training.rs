use crate::handler::{BasicHandler, HttpError, ResultHandler};
use rmjac_core::model::training::{CreateTrainingProps};

pub struct Create {
    basic: BasicHandler,
    training: CreateTrainingProps,
}

