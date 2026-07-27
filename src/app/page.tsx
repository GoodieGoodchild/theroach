import Experience from '@/components/Experience';

/**
 * Single-route site, by design: the landing gate → story → the line (WhatsApp).
 * All copy is server-rendered inside Experience's children for SEO; the client
 * layer only orchestrates the theatre on top of it.
 */
export default function Page() {
  return <Experience />;
}
