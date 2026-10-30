import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'投资 X Buddy · 个人研究工作台',description:'把投资直觉拆成可核验的问题。真实数据、证据分歧与结论翻转条件。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
