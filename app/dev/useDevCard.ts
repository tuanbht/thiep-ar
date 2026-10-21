'use client';
/* A card for the dev pages: ?t=<template> with the words its form starts with (?words= sets a 3D act's board, each
   ?photo= adds a photo, in order). */
import { useEffect, useState } from 'react';
import { formSpecSchema } from '@/lib/catalog/form';
import { presetContent, toCard } from '@/lib/content/toCard';
import type { Card } from '@/lib/player/core/card';

export function useDevCard(): { card: Card | null; params: URLSearchParams | null } {
  const [state, setState] = useState<{ card: Card | null; params: URLSearchParams | null }>({ card: null, params: null });
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = (params.get('t') || 'flower-letter').replace(/[^a-z0-9_-]/gi, '');
    fetch(`/templates/${t}/form.json`).then(r => r.json()).then((raw: unknown) => {
      const content = presetContent(formSpecSchema.parse(raw));
      if (params.get('words')) content.slots = { ...content.slots, board: params.get('words') ?? '' };
      if (!content.title) content.title = 'Gửi Hanna';
      setState({ card: toCard(content, { template: t, design: null }, params.getAll('photo').filter(Boolean)), params });
    }, (e: unknown) => console.error('[dev] no form for', t, e));
  }, []);
  return state;
}
