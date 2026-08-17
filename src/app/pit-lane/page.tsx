import React from 'react';
import ProfileForm from '@/modules/members/components/ProfileForm';
import FbaDisclaimer from '@/modules/presence/components/FbaDisclaimer';

export default function PitLanePage() {
  return (
    <div className="container mx-auto px-6 py-12 space-y-6">
      <FbaDisclaimer />
      <ProfileForm />
    </div>
  );
}
