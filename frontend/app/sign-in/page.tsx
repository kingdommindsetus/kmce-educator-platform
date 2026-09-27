"use client";
import {useState} from "react";

export default function SignIn(){
  const [email,setEmail]=useState("");
  const [notice,setNotice]=useState("");
  const base=process.env.NEXT_PUBLIC_NEON_AUTH_URL||"";

  async function emailSignIn(e:any){
    e.preventDefault();
    if(!base){setNotice("Auth is not configured for this deployment.");return;}
    setNotice("Sending secure sign-in link…");
    const r=await fetch(base.replace(/\/$/,"")+"/api/auth/sign-in/magic-link",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email,callbackURL:window.location.origin+"/"})
    });
    setNotice(r.ok?"Check your email for the secure sign-in link.":"Sign-in request failed. Please try again.");
  }

  function google(){
    if(!base){setNotice("Auth is not configured for this deployment.");return;}
    const cb=encodeURIComponent(window.location.origin+"/");
    window.location.href=base.replace(/\/$/,"")+"/api/auth/sign-in/social?provider=google&callbackURL="+cb;
  }

  return <main className="shell" style={{maxWidth:620}}>
    <div className="eyebrow">KINGDOM MINDSET CE</div>
    <h1>Secure Sign In</h1>
    <p className="muted">One KMCE identity for Founder, Educator, and Student access.</p>
    <button className="btn primary" onClick={google}>Continue with Google</button>
    <form onSubmit={emailSignIn} style={{marginTop:24}}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" required style={{width:"100%",padding:14}}/>
      <button className="btn" style={{marginTop:12}} type="submit">Email me a secure sign-in link</button>
    </form>
    {notice&&<p style={{marginTop:18}}><b>{notice}</b></p>}
  </main>
}
