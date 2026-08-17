'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import BarSelfServiceView from '@/modules/buvette/components/BarSelfServiceView';

export default function BuvetteSelfServicePage() {
  const { profile } = useAuth();

  return <BarSelfServiceView member={profile} />;
}
