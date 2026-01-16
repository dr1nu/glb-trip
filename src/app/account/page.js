import { Suspense } from 'react';
import AccountClient from './AccountClient';

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountClient />
    </Suspense>
  );
}
