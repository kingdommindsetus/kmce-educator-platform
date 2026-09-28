import {AuthView} from "@neondatabase/auth-ui";
import {authViewPaths} from "@neondatabase/auth-ui/server";

export const dynamicParams=false;

export function generateStaticParams(){
  return Object.values(authViewPaths).map(path=>({path}));
}

export default async function AuthPage({params}:{params:Promise<{path:string}>}){
  const {path}=await params;
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="auth-mark">KM</div>
        <div className="auth-kicker">KINGDOM MINDSET CE</div>
        <h1>Education built for clinical impact.</h1>
        <p>Secure access for KMCE founders, educators, and learning operations.</p>
        <div className="auth-rule"/>
        <small>AGD PACE Provider #441585</small>
      </section>
      <section className="auth-panel">
        <div className="auth-mobile-brand">KINGDOM MINDSET CE</div>
        <div className="auth-card">
          <div className="auth-card-heading">
            <span>SECURE PORTAL</span>
            <h2>Welcome back.</h2>
            <p>Sign in to continue to your KMCE workspace.</p>
          </div>
          <div className="auth-view"><AuthView path={path}/></div>
        </div>
        <p className="auth-footer">Protected access · Kingdom Mindset CE</p>
      </section>
    </main>
  );
}
