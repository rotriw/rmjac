// TODO: New edge design.

    // Self: Into<EdgeActive> + Clone + Send + Sync + std::fmt::Debug,
    // EdgeModel: Into<Edge>
    //     + Send
    //     + Sync
    //     + From<<<EdgeActive as ActiveModelTrait>::Entity as EntityTrait>::Model>,
    // EdgeActive: DbEdgeActiveModel<EdgeModel, Edge>
    //     + Sized
    //     + Send
    //     + Sync
    //     + ActiveModelTrait
    //     + ActiveModelBehavior
    //     + DbEdgeInfo,
    // <EdgeActive::Entity as EntityTrait>::Model: IntoActiveModel<EdgeActive> + Send + Sync,

//     use sea_orm::DatabaseConnection;


// pub trait EdgeRaw<E, DM, DA> {
//     const EDGE_TYPE: &'static str;
//     fn save(&self, db: &DatabaseConnection) -> impl Future<Output = Result<E>> {}
// }

// pub trait EdgeInfo {
//     const EDGE_TYPE: &'static str;
// }

// pub trait BasicEdge {
//     fn get_u(&self) -> i64;
//     fn get_v(&self) -> i64;
// }

// impl<E, DM, DA, R> EdgeRaw<E, DM, DA> for R
// where R: EdgeInfo + Into<DA> {
//     const EDGE_TYPE: &'static str = R::EDGE_TYPE;
//     fn save(&self, db: &DatabaseConnection) -> impl Future<Output = Result<E>> {
//         async {
//             let edge_type = Self::EDGE_TYPE;
//             async {
//                 let edge_type = self.get_edge_type();
//                 let edge_id = create_edge(db, edge_type).await?.edge_id;
//                 log::debug!("Saving edge({edge_type}), data:{:?}", *self);
//                 let mut value = (*self).clone().conv::<DA>();
//                 value.set(self.get_edge_id_column(), edge_id.into());
//                 Ok(value.save_into_db(db).await?.into())
//             }
//         }
//     }
// }