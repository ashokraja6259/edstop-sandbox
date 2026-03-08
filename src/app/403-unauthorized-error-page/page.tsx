'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function UnauthorizedErrorPage() {
const { user } = useAuth();
const router = useRouter();

return ( <div className="min-h-screen flex flex-col items-center 
justify-center text-center px-6"> <h1 className="text-4xl font-bold">403 - 
Access Restricted</h1>

```
  <p className="mt-4 text-gray-500">
    You do not have permission to access this resource.
  </p>

  <div className="flex gap-4 mt-8">
    {!user && (
      <Link href="/login" className="px-5 py-3 bg-purple-600 text-white 
rounded-lg">
        Sign In
      </Link>
    )}

    {user && (
      <Link href="/student-dashboard" className="px-5 py-3 bg-purple-600 
text-white rounded-lg">
        Dashboard
      </Link>
    )}

    <button
      onClick={() => router.back()}
      className="px-5 py-3 border rounded-lg"
    >
      Go Back
    </button>
  </div>
</div>
```

);
}

