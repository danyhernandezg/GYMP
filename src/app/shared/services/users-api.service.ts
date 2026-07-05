import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserRole } from './auth-api.service';

export interface AppUser {
  _id: string;
  username: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  avatar: string;
  social: {
    facebook: string;
    x: string;
    linkedin: string;
    instagram: string;
  };
  address: {
    country: string;
    cityState: string;
    postalCode: string;
    taxId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppUser {
  username: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  social?: AppUser['social'];
  address?: AppUser['address'];
}

export type UpdateAppUser = Partial<CreateAppUser>;

@Injectable({
  providedIn: 'root'
})
export class UsersApiService {
  private readonly apiUrl = '/api/users';

  constructor(private readonly http: HttpClient) {}

  listUsers() {
    return this.http.get<AppUser[]>(this.apiUrl);
  }

  listCoaches() {
    return this.http.get<AppUser[]>('/api/coaches');
  }

  listStudents() {
    return this.http.get<AppUser[]>('/api/students');
  }

  createUser(user: CreateAppUser) {
    return this.http.post<AppUser>(this.apiUrl, user);
  }

  updateUser(id: string, user: UpdateAppUser) {
    return this.http.patch<AppUser>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
