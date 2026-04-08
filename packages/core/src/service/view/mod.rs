use crate::model::problem::Problem;

pub trait ViewTreeProblem {

}

pub trait ViewProblemList {
    fn get_problems(&self) -> Vec<Problem>;
}
