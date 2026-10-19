'use client';

import Link from 'next/link';
import { VscRefresh } from 'react-icons/vsc';

export default function ErrorPage({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <div className="container page-wrapper"><div className="cx-empty" role="alert"><VscRefresh /><h1>A brief intermission.</h1><p>Something interrupted this page. Try again, or head back to discover another story.</p><div className="cx-hero-actions" style={{ justifyContent: 'center' }}><button className="cx-button" onClick={unstable_retry}>Try again</button><Link href="/" className="cx-button cx-button--secondary">Back to discover</Link></div></div></div>;
}
