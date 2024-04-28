import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
require('dotenv').config();
import { errorMiddleware } from "./middleware/error";
export const app=express();

//body parser
app.use(express.urlencoded({extended:true, limit:'50mb'}));
app.use(cookieParser());
app.use(express.json());
//enable CORS

const whitelist = process.env.ORIGINS ? process.env.ORIGINS.split(',') : [];
console.log(whitelist);

const options: cors.CorsOptions = {
  origin: whitelist  
};
app.use( cors());







//uses router this router need to be used after passport so after authentication
app.use('/', require('./routes'));


app.all('*',(req:Request,res:Response,next:NextFunction)=>{
    const err=new Error(`Router address ${req.originalUrl} not found `) as any;
    err.statusCode=404;
    next(err);
});//1.12.39

app.use(errorMiddleware);