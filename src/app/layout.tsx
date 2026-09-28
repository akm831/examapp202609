import type { Metadata, Viewport } from "next"; import "./globals.css"; import { ServiceWorker } from "@/components/service-worker";
export const metadata:Metadata={title:"試験対策",description:"593問の○×復習アプリ",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"試験対策"}};
export const viewport:Viewport={themeColor:"#173f35",width:"device-width",initialScale:1,viewportFit:"cover"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}<ServiceWorker/></body></html>}
