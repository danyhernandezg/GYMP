import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppUser } from './users-api.service';

export interface ClassOffering {
  _id: string;
  name: string;
  type: string;
  description: string;
  coach?: AppUser;
  capacity: number;
  enrolledCount: number;
  availableSpots: number;
  isFull: boolean;
  isEnrolled: boolean;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface SaveClassOffering {
  name: string;
  type: string;
  description?: string;
  coachId?: string;
  capacity: number;
  status?: 'active' | 'archived';
}

@Injectable({
  providedIn: 'root'
})
export class ClassesApiService {
  private readonly apiUrl = '/api/classes';

  constructor(private readonly http: HttpClient) {}

  listClasses() {
    return this.http.get<ClassOffering[]>(this.apiUrl);
  }

  createClass(classOffering: SaveClassOffering) {
    return this.http.post<ClassOffering>(this.apiUrl, classOffering);
  }

  updateClass(id: string, classOffering: Partial<SaveClassOffering>) {
    return this.http.patch<ClassOffering>(`${this.apiUrl}/${id}`, classOffering);
  }

  deleteClass(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  enroll(id: string) {
    return this.http.post<ClassOffering>(`${this.apiUrl}/${id}/enroll`, {});
  }

  unenroll(id: string) {
    return this.http.delete<ClassOffering>(`${this.apiUrl}/${id}/enroll`);
  }
}
