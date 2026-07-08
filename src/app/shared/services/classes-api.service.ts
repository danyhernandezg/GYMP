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
  enrolledStudents: AppUser[];
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ClassAvailabilitySlot {
  time: string;
  available: boolean;
  reason: 'past' | 'full' | 'student_busy' | 'coach_busy' | '';
}

export interface ClassAvailability {
  date: string;
  slots: ClassAvailabilitySlot[];
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

  getAvailability(id: string, date: string, studentId?: string) {
    return this.http.get<ClassAvailability>(`${this.apiUrl}/${id}/availability`, {
      params: studentId ? { date, studentId } : { date }
    });
  }

  enroll(id: string, schedule: { start: string; studentId?: string }) {
    return this.http.post<ClassOffering>(`${this.apiUrl}/${id}/enroll`, schedule);
  }

  unenroll(id: string, studentId?: string) {
    return this.http.delete<ClassOffering>(`${this.apiUrl}/${id}/enroll`, {
      params: studentId ? { studentId } : {}
    });
  }
}
