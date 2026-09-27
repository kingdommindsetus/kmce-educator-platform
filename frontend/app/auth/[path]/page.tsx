import {AuthView} from "@neondatabase/auth-ui";
import {authViewPaths} from "@neondatabase/auth-ui/server";
export const dynamicParams=false;
export function generateStaticParams(){return Object.values(authViewPaths).map(path=>({path}));}
export default async function AuthPage({params}:{params:{path:string}}){
 return <main style={{maxWidth:560,margin:"48px auto",padding:24}}><AuthView path={params.path}/></main>;
}
