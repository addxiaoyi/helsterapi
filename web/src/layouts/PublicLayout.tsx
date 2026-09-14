import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from '../components/ui/PublicHeader'; export default function PublicLayout() { return ( <> <PublicHeader /> <Outlet /> </> );
}
