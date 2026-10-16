/* Dev-only pages for trying the player on its own (pnpm dev). Not there in production. */
import { notFound } from 'next/navigation';

export default function DevLayout({ children }: LayoutProps<'/dev'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  return children;
}
