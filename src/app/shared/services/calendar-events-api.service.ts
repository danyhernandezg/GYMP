import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppUser } from './users-api.service';

export interface CalendarClassEvent {
  _id: string;
  title: string;
  start: string;
  end: string;
  calendar: 'Danger' | 'Success' | 'Primary' | 'Warning';
  student: AppUser;
  coach: AppUser;
  classOffering?: string;
  google: {
    studentEventId: string;
    coachEventId: string;
    studentSyncStatus: 'pending' | 'synced' | 'failed' | 'skipped';
    coachSyncStatus: 'pending' | 'synced' | 'failed' | 'skipped';
    lastError: string;
  };
}

export interface SaveCalendarClassEvent {
  title: string;
  start: string;
  end: string;
  calendar: 'Danger' | 'Success' | 'Primary' | 'Warning';
  coachId?: string;
  studentId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarEventsApiService {
  constructor(private readonly http: HttpClient) {}

  listEvents() {
    return this.http.get<CalendarClassEvent[]>('/api/calendar-events');
  }

  createEvent(event: SaveCalendarClassEvent) {
    return this.http.post<CalendarClassEvent>('/api/calendar-events', event);
  }

  updateEvent(id: string, event: Partial<SaveCalendarClassEvent>) {
    return this.http.patch<CalendarClassEvent>(`/api/calendar-events/${id}`, event);
  }

  deleteEvent(id: string) {
    return this.http.delete<void>(`/api/calendar-events/${id}`);
  }
}
