import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AppUser } from './users-api.service';

export type UserRole = 'administrador' | 'coach' | 'alumno';

interface LoginResponse {
  token: string;
  user: {
    username: string;
    role: UserRole;
  };
}

interface MeResponse {
  user: AppUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly tokenKey = 'tailadmin_auth_token';
  private readonly userKey = 'tailadmin_auth_user';

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(username: string, password: string) {
    return this.http.post<LoginResponse>('/api/auth/login', { username, password }).pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
      })
    );
  }

  loadCurrentUser() {
    return this.http.get<MeResponse>('/api/auth/me').pipe(
      tap((response) => {
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
      })
    );
  }

  updateCurrentUser(user: Partial<AppUser>) {
    return this.http.patch<MeResponse>('/api/auth/me', user).pipe(
      tap((response) => {
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/signin']);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated() {
    return Boolean(this.getToken());
  }

  getUser() {
    const rawUser = localStorage.getItem(this.userKey);
    return rawUser ? JSON.parse(rawUser) as AppUser | LoginResponse['user'] : null;
  }
}
