import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

interface GoogleCalendarStatus {
  connected: boolean;
  email: string;
  configured: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarApiService {
  constructor(private readonly http: HttpClient) {}

  getStatus() {
    return this.http.get<GoogleCalendarStatus>('/api/google/status');
  }

  getAuthUrl() {
    return this.http.get<{ url: string }>('/api/google/auth-url');
  }
}
