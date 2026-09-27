import "./globals.css";
import "@neondatabase/auth-ui/css";
import {Providers} from "./providers";
export const metadata={title:"KMCE Founder Command Center",description:"Kingdom Mindset CE operating system"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}
