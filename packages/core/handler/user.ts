
import { Route } from "../handle"
import { param } from "../utils/decorate"
import {User} from "../model/user";
import {connect} from "mongoose";
import {sha512} from "js-sha512";

export class SignInHandler {
    async get() {

    }
    @param('username')
    @param('pwdSHA512')
    async postCheck(username :string, pwdSHA512 :string) {

    }
}

export class RegisterHandler {
    async get() {

    }
    @param('username')
    @param('pwdSHA512')
    @param('email')
    @param('description')
    async post(username :string, pwdSHA512 :string, email :string, description :string = '') {
        await connect(global.RMJ.dbURL || 'mongodb://localhost/rmjac');
        const user = new User({
            username,
            pwdSHA512: sha512(pwdSHA512),
            email,
            description,
            ConnectionAccount: []
        })
        let finds = await User.findOne({'username': username});
        console.log(finds);
        if (finds !== null) {
            return ;
        }
        user.save();
    }
}

export function apply(ctx) {
    Route('login', '/login', SignInHandler);
    Route('register', '/register', RegisterHandler);
}
