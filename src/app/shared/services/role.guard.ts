import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthApiService, UserRole } from './auth-api.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthApiService);
  const router = inject(Router);
  const allowedRoles = (route.data?.['roles'] || []) as UserRole[];
  const userRole = auth.getUser()?.role;

  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  return router.createUrlTree(['/calendar']);
};

export const routeAccessGuard: CanActivateFn = (route) => {
  const auth = inject(AuthApiService);
  const router = inject(Router);
  const userRole = auth.getUser()?.role;
  const path = route.routeConfig?.path || '';

  if (!userRole) {
    return router.createUrlTree(['/signin']);
  }

  if (userRole === 'alumno' && !['calendar', 'classes', 'profile'].includes(path)) {
    return router.createUrlTree(['/calendar']);
  }

  return true;
};
