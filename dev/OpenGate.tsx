import type { ReactNode } from 'react';
/** DEV ONLY (mock mode): renders the app without the access-code gate. */
export default function OpenGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
