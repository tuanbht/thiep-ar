'use client';
/* <LivePreview>: the shop's preview box. three.js loads only in the browser, after the page. */
import dynamic from 'next/dynamic';
import type { LivePreviewProps } from './types';
import s from './liveClasses';
import { fontVars } from './fonts';
import { T } from './strings';

const View = dynamic(() => import('./LivePreviewView'), {
  ssr: false,
  loading: () => <div className={`${s.box} ${fontVars}`}><div className={s.status}>{T.loading}</div></div>
});

export function LivePreview(props: LivePreviewProps) {
  return <View {...props} />;
}

export default LivePreview;
