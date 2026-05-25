'use client';

import React from 'react';
import ReportsView from '../../../components/reports/ReportsView';
import { useAuth } from '../../../context/AuthContext';

export default function ManagerReportsPage() {
  const { user } = useAuth();
  
  return (
    <ReportsView 
      role="Manager" 
      userScope={{ 
        company: user?.company,
        name: user?.name 
      }} 
    />
  );
}
