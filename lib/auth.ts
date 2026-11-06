import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { admin } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
const uri=process.env.MONGODB_URI, secret=process.env.BETTER_AUTH_SECRET;
if(!uri) throw new Error("MONGODB_URI is required for authentication."); if(!secret) throw new Error("BETTER_AUTH_SECRET is required for authentication.");
const mongoUri: string=uri; const authSecret: string=secret;
const globalForAuth=globalThis as typeof globalThis & {betterAuthCache?:AuthCache}; const cache=globalForAuth.betterAuthCache??{}; globalForAuth.betterAuthCache=cache;
function createAuth(client:MongoClient) { return betterAuth({ database:mongodbAdapter(client.db(),{client,transaction:false}),secret:authSecret,baseURL:process.env.BETTER_AUTH_URL||"http://localhost:3000",emailAndPassword:{enabled:true,minPasswordLength:8,requireEmailVerification:true,resetPasswordTokenExpiresIn:3600,sendResetPassword:async({user,url})=>sendPasswordResetEmail({name:user.name,email:user.email,url})},emailVerification:{sendOnSignUp:true,autoSignInAfterVerification:true,sendVerificationEmail:async({user,url})=>sendVerificationEmail({name:user.name,email:user.email,url})},plugins:[admin({defaultRole:"user",adminRoles:["admin"]})]}); }
export async function getAuth():Promise<AuthInstance>{ if(cache.auth)return cache.auth; if(!cache.promise) cache.promise=(async()=>{const client=new MongoClient(mongoUri,{maxPoolSize:10,minPoolSize:0,serverSelectionTimeoutMS:10_000}); await client.connect(); cache.client=client; cache.auth=createAuth(client); return cache.auth;})().catch((error)=>{cache.promise=undefined; throw error;}); try{return await cache.promise;} finally{cache.promise=undefined;} }
type AuthInstance=ReturnType<typeof createAuth>; type AuthCache={client?:MongoClient; auth?:AuthInstance; promise?:Promise<AuthInstance>};
function isClosedTopology(error:unknown){return error instanceof Error && (error.name==="MongoTopologyClosedError"||error.name==="MongoClientClosedError");}
async function discardAuth(client:MongoClient|undefined){ if(!client || client!==cache.client)return; cache.auth=undefined;cache.client=undefined;cache.promise=undefined; await client.close().catch(()=>undefined); }
/** Retries exactly once only after a stale native Mongo client is reported closed. */
export async function withAuthRecovery<T>(operation:(auth:AuthInstance)=>Promise<T>):Promise<T>{ let client:MongoClient|undefined; for(let attempt=0;attempt<2;attempt++){const auth=await getAuth();client=cache.client;try{return await operation(auth);}catch(error){if(attempt===0&&isClosedTopology(error)){await discardAuth(client);continue;}throw error;}} throw new Error("Authentication retry exhausted."); }
