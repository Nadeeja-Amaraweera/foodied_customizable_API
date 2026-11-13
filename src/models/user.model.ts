import {Document, model, Schema} from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER"
}

export interface IUSer extends Document {
    name :string
    email :string
    password? :string
    googleId? :string
    roles? :UserRole[]
    matchPassword(enterPassword: string): Promise<boolean>
}

const userSchema = new Schema<IUSer>(
    {
        name:{
            type: String,
            required: [true, 'Name is Required']
        },
        email:{
            type:String,
            required: [true, 'Email is Required'],
            unique: true,
            lowecase: true,
            trim: true
        },
        password:{
            type:String,
            required: false,
            minlength: [6, 'Password must be at least 6 characters']
        },
        googleId:{
            type:String,
            required:false
        },
        roles:{
            type:[String],
            enum: Object.values(UserRole),
            default:[UserRole.USER]
        }

    },
    {
        timestamps: true
    }
)
export const UserModel = model<IUSer>("system_users",userSchema)