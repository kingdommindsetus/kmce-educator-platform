import "@neondatabase/auth-ui/css";
import "./globals.css";
import {Providers} from "./providers";

export const metadata={
  title:"KMCE Founder & Educator Portal",
  description:"Secure Kingdom Mindset CE operations and educator access"
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
