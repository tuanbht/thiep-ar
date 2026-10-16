'use client';
/* /dev/player?t=<template>&mode=ar|preview : the gift player on its own. Events land in window.__events. */
import { GiftPlayer } from '@/components/player';
import { useDevCard } from '../useDevCard';

declare global { interface Window { __events?: [string, unknown][] } }

export default function DevPlayer() {
  const { card, params } = useDevCard();
  if (!card || !params) return null;
  return (
    <GiftPlayer card={card} initialMode={params.get('mode') === 'preview' ? 'preview' : 'ar'}
      onEvent={(name, props) => { (window.__events ??= []).push([name, props ?? null]); }} />
  );
}
