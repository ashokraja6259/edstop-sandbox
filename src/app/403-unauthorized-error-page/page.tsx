'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function UnauthorizedErrorPage() {
const { user } = useAuth();
const router = useRouter();

const headingRef = useRef<HTMLHeadingElement>(null);

const [requestSent, setRequestSent] = useState(false);
const [requestLoading, setRequestLoading] = useState(false);

useEffect(() => {
headingRef.current?.focus();
}, []);

const handleRequestAccess = async () => {
setRequestLoading(true);
await new Promise((resolve) => setTimeout(resolve, 1200));
setRequestLoading(false);
setRequestSent(true);
};

return ( <div className="min-h-screen flex flex-col items-center 
justify-center px-6 text-center"> <h1
     ref={headingRef}
     tabIndex={-1}
     className="text-4xl font-bold text-white"
   >
403 – Access Restricted </h1>

```
  <p className="mt-4 text-gray-400 max-w-md">
    You do not have permission to access this resource.
  </p>

  <div className="flex gap-4 mt-8">
    {!user && (
      <Link
        href="/login"
        className="px-5 py-3 bg-purple-600 text-white rounded-lg"
      >
        Sign In
      </Link>
    )}

    {user && (
      <Link
        href="/student-dashboard"
        className="px-5 py-3 bg-purple-600 text-white rounded-lg"
      >
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

  {!requestSent && user && (
    <button
      onClick={handleRequestAccess}
      disabled={requestLoading}
      className="mt-6 text-sm text-purple-400"
    >
      Request Access
    </button>
  )}
</div>
```

);
}

