import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthApiService } from './auth-api.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthApiService).getToken();

  if (!token || req.url.includes('/api/auth/login')) {
    return next(req);
  }

  return next(req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  }));
};
