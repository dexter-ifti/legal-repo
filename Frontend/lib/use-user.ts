'use client';

import { useState, useEffect } from 'react';
import { currentUser as mockCurrentUser } from './mock-data';
import { DEMO_USER_IDS, DEMO_ORGANIZATION_IDS } from './demo-users';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  organizationId: string;
  isDemo: boolean;
}

export function useUserProfile(): { user: UserProfile; loading: boolean } {
  const [user, setUser] = useState<UserProfile>({
    id: mockCurrentUser.id,
    name: mockCurrentUser.name,
    email: mockCurrentUser.email,
    role: mockCurrentUser.role,
    initials: mockCurrentUser.initials,
    organizationId: DEMO_ORGANIZATION_IDS.lexflowDemo,
    isDemo: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          const email = parsed.email || '';
          const isDemo =
            email.toLowerCase().includes('sarah.mitchell') ||
            email.toLowerCase().includes('demo');

          const name = parsed.name || (isDemo ? 'Sarah Mitchell' : 'Legal Advocate');
          const nameParts = name.trim().split(' ');
          const initials =
            nameParts.length >= 2
              ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
              : name.slice(0, 2).toUpperCase();

          setUser({
            id: parsed.id || (isDemo ? DEMO_USER_IDS.sarahMitchell : DEMO_USER_IDS.genericAdvocate),
            name,
            email,
            role: parsed.role || (isDemo ? 'Senior Paralegal' : 'Advocate / Lawyer'),
            initials,
            organizationId: parsed.organizationId || DEMO_ORGANIZATION_IDS.default,
            isDemo,
          });
        } catch (e) {
          console.error('Failed to parse user profile:', e);
        }
      }
      setLoading(false);
    }
  }, []);

  return { user, loading };
}
