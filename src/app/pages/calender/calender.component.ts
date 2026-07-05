import { KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';

import { Component, ViewChild } from '@angular/core';
import { EventInput, CalendarOptions, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { AuthApiService, UserRole } from '../../shared/services/auth-api.service';
import { AppUser, UsersApiService } from '../../shared/services/users-api.service';
import { CalendarClassEvent, CalendarEventsApiService } from '../../shared/services/calendar-events-api.service';
import { GoogleCalendarApiService } from '../../shared/services/google-calendar-api.service';

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    classEvent?: CalendarClassEvent;
  };
}

@Component({
  selector: 'app-calender',
  imports: [
    FormsModule,
    KeyValuePipe,
    FullCalendarModule,
    ModalComponent
  ],
  templateUrl: './calender.component.html',
  styles: ``
})
export class CalenderComponent {

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  events: CalendarEvent[] = [];
  coaches: AppUser[] = [];
  students: AppUser[] = [];
  currentUser: AppUser | null = null;
  selectedEvent: CalendarEvent | null = null;
  eventTitle = '';
  eventStartDate = '';
  eventStartTime = '';
  eventLevel = '';
  selectedCoachId = '';
  selectedStudentId = '';
  isOpen = false;
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  googleConnected = false;
  googleConfigured = false;
  googleEmail = '';

  calendarsEvents: Record<string, string> = {
    Danger: 'danger',
    Success: 'success',
    Primary: 'primary',
    Warning: 'warning'
  };

  hourOptions = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
  private readonly scheduleTimeZone = 'America/El_Salvador';

  calendarOptions: CalendarOptions = this.buildCalendarOptions();

  constructor(
    private readonly auth: AuthApiService,
    private readonly usersApi: UsersApiService,
    private readonly calendarEventsApi: CalendarEventsApiService,
    private readonly googleCalendarApi: GoogleCalendarApiService
  ) {}

  ngOnInit() {
    this.auth.loadCurrentUser().subscribe({
      next: (response) => {
        this.currentUser = response.user;
        this.refreshCalendarOptions();
        this.loadGoogleStatus();
        this.loadCoaches();
        this.loadStudents();
        this.loadEvents();
      },
      error: () => {
        this.errorMessage = 'Unable to load calendar user.';
        this.isLoading = false;
      }
    });
  }

  buildCalendarOptions(): CalendarOptions {
    const canCreateEvents = this.canCreateEvents();

    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: canCreateEvents ? 'prev,next addEventButton' : 'prev,next',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      selectable: canCreateEvents,
      events: this.events,
      select: (info) => this.handleDateSelect(info),
      eventClick: (info) => this.handleEventClick(info),
      customButtons: {
        addEventButton: {
          text: 'Add Event +',
          click: () => this.openCreateModal()
        }
      },
      eventContent: (arg) => this.renderEventContent(arg)
    };
  }

  refreshCalendarOptions() {
    this.calendarOptions = this.buildCalendarOptions();
  }

  setCalendarEvents(events: CalendarEvent[]) {
    this.events = events;
    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.events
    };
  }

  loadEvents() {
    this.isLoading = true;
    this.calendarEventsApi.listEvents().subscribe({
      next: (events) => {
        this.setCalendarEvents(events.map((event) => this.toFullCalendarEvent(event)));
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to load calendar events.';
        this.isLoading = false;
      }
    });
  }

  loadCoaches() {
    this.usersApi.listCoaches().subscribe({
      next: (coaches) => {
        this.coaches = coaches;
      }
    });
  }

  loadStudents() {
    this.usersApi.listStudents().subscribe({
      next: (students) => {
        this.students = students;
      }
    });
  }

  loadGoogleStatus() {
    this.googleCalendarApi.getStatus().subscribe({
      next: (status) => {
        this.googleConnected = status.connected;
        this.googleConfigured = status.configured;
        this.googleEmail = status.email;
      }
    });
  }

  connectGoogleCalendar() {
    this.googleCalendarApi.getAuthUrl().subscribe({
      next: ({ url }) => {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Google Calendar is not configured.';
      }
    });
  }

  handleDateSelect(selectInfo: DateSelectArg) {
    if (!this.canCreateEvents()) {
      return;
    }

    this.resetModalFields();
    this.openCreateModal(selectInfo.startStr);
  }

  handleEventClick(clickInfo: EventClickArg) {
    const event = clickInfo.event as any;
    this.selectedEvent = {
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      extendedProps: {
        calendar: event.extendedProps.calendar,
        classEvent: event.extendedProps.classEvent
      }
    };
    this.eventTitle = event.extendedProps.classEvent?.title || event.title;
    this.eventStartDate = this.formatDateForInput(event.startStr);
    this.eventStartTime = this.formatTimeForInput(event.startStr);
    this.eventLevel = event.extendedProps.calendar;
    this.selectedCoachId = event.extendedProps.classEvent?.coach?._id || '';
    this.selectedStudentId = event.extendedProps.classEvent?.student?._id || '';
    this.openModal();
  }

  handleAddOrUpdateEvent() {
    if (!this.eventTitle || !this.eventStartDate || !this.eventStartTime || !this.eventLevel) {
      this.errorMessage = 'Title, date, time and color are required.';
      return;
    }

    if (!this.selectedEvent && this.currentUser?.role === 'alumno' && !this.selectedCoachId) {
      this.errorMessage = 'Select a coach before adding the class.';
      return;
    }

    if (!this.selectedEvent && this.currentUser?.role === 'coach' && !this.selectedStudentId) {
      this.errorMessage = 'Select a student before adding the class.';
      return;
    }

    if (!this.selectedEvent && this.currentUser?.role === 'administrador' && (!this.selectedCoachId || !this.selectedStudentId)) {
      this.errorMessage = 'Select a coach and a student before adding the class.';
      return;
    }

    if (this.isHourDisabled(this.eventStartTime)) {
      this.errorMessage = 'This coach or student already has an event scheduled at that time.';
      return;
    }

    if (this.isPastHour(this.eventStartTime)) {
      this.errorMessage = 'Select a future time in El Salvador time.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const start = this.buildStartDateTime();
    const end = this.buildEndDateTime();

    if (this.selectedEvent) {
      this.calendarEventsApi.updateEvent(this.selectedEvent.id as string, {
        title: this.eventTitle,
        start,
        end,
        calendar: this.eventLevel as CalendarClassEvent['calendar'],
        coachId: this.selectedCoachId,
        studentId: this.selectedStudentId
      }).subscribe({
        next: (event) => this.upsertLocalEvent(event),
        error: (error) => this.handleSaveError(error)
      });
      return;
    }

    this.calendarEventsApi.createEvent({
      title: this.eventTitle,
      start,
      end,
      calendar: this.eventLevel as CalendarClassEvent['calendar'],
      coachId: this.selectedCoachId,
      studentId: this.selectedStudentId
    }).subscribe({
      next: (event) => this.upsertLocalEvent(event),
      error: (error) => this.handleSaveError(error)
    });
  }

  upsertLocalEvent(event: CalendarClassEvent) {
    const calendarEvent = this.toFullCalendarEvent(event);
    const eventExists = this.events.some((item) => item.id === event._id);
    const events = eventExists
      ? this.events.map((item) => item.id === event._id ? calendarEvent : item)
      : [...this.events, calendarEvent];
    this.setCalendarEvents(events);
    this.successMessage = this.getSaveSuccessMessage(event);
    this.isSaving = false;
    this.closeModal();
  }

  handleSaveError(error: any) {
    this.errorMessage = error?.error?.message || 'Unable to save event.';
    this.successMessage = '';
    this.isSaving = false;
  }

  resetModalFields() {
    this.eventTitle = '';
    this.eventStartDate = '';
    this.eventStartTime = '';
    this.eventLevel = '';
    this.selectedCoachId = '';
    this.selectedStudentId = '';
    this.selectedEvent = null;
  }

  openCreateModal(startDate?: string) {
    this.resetModalFields();
    this.errorMessage = '';
    this.successMessage = '';
    const today = this.getElSalvadorToday();
    const selectedDate = startDate ? this.formatDateForInput(startDate) : today;
    this.eventStartDate = selectedDate < today ? today : selectedDate;
    const selectedTime = startDate && startDate.includes('T') ? this.formatTimeForInput(startDate) : '';
    this.eventStartTime = selectedTime && !this.isPastHour(selectedTime) ? selectedTime : this.getDefaultStartTimeForDate(this.eventStartDate);
    this.eventLevel = 'Primary';
    this.openModal();
  }

  openModal() {
    this.isOpen = true;
  }

  closeModal() {
    this.isOpen = false;
    this.resetModalFields();
  }

  getSaveSuccessMessage(event: CalendarClassEvent) {
    const statuses = [event.google?.studentSyncStatus, event.google?.coachSyncStatus];
    const syncedCount = statuses.filter((status) => status === 'synced').length;

    if (syncedCount === 2) {
      return 'Evento guardado y sincronizado en Google Calendar para alumno y coach.';
    }

    if (syncedCount === 1) {
      return 'Evento guardado. Google Calendar fue sincronizado para una de las cuentas; la otra cuenta aun debe conectar Google Calendar.';
    }

    if (statuses.some((status) => status === 'failed')) {
      return 'Evento guardado en Mongo, pero Google Calendar no pudo sincronizarse.';
    }

    return 'Evento guardado en Mongo. Google Calendar queda pendiente hasta conectar las cuentas.';
  }

  renderEventContent(eventInfo: any) {
    const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar?.toLowerCase()}`;
    return {
      html: `
        <div class="event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm">
          <div class="fc-daygrid-event-dot"></div>
          <div class="fc-event-time">${eventInfo.timeText || ''}</div>
          <div class="fc-event-title">${eventInfo.event.title}</div>
        </div>
      `
    };
  }

  canCreateEvents() {
    return this.currentUser?.role === 'administrador' || this.currentUser?.role === 'alumno' || this.currentUser?.role === 'coach';
  }

  buildStartDateTime() {
    return `${this.eventStartDate}T${this.eventStartTime}:00-06:00`;
  }

  buildEndDateTime() {
    const start = new Date(this.buildStartDateTime());
    return new Date(start.getTime() + 60 * 60 * 1000).toISOString();
  }

  formatDateForInput(value: string | Date) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    return this.getElSalvadorDateParts(new Date(value)).date;
  }

  formatTimeForInput(value: string | Date) {
    return `${String(this.getElSalvadorDateParts(new Date(value)).hour).padStart(2, '0')}:00`;
  }

  eventEndLabel() {
    if (!this.eventStartDate || !this.eventStartTime) {
      return '';
    }

    const start = new Date(this.buildStartDateTime());
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return `${String(this.getElSalvadorDateParts(end).hour).padStart(2, '0')}:00`;
  }

  minScheduleDate() {
    return this.getElSalvadorToday();
  }

  visibleHourOptions() {
    return this.hourOptions.filter((hour) => !this.isPastHour(hour));
  }

  isPastHour(hour: string) {
    if (!this.eventStartDate || !hour) {
      return false;
    }

    const today = this.getElSalvadorToday();

    if (this.eventStartDate < today) {
      return true;
    }

    if (this.eventStartDate > today) {
      return false;
    }

    return Number(hour.slice(0, 2)) <= this.getElSalvadorDateParts(new Date()).hour;
  }

  getDefaultStartTimeForDate(date: string) {
    if (date > this.getElSalvadorToday()) {
      return '08:00';
    }

    const nextHour = this.getElSalvadorDateParts(new Date()).hour + 1;

    if (nextHour > 23) {
      this.eventStartDate = this.addDaysToDate(date, 1);
      return '00:00';
    }

    return `${String(nextHour).padStart(2, '0')}:00`;
  }

  getElSalvadorToday() {
    return this.getElSalvadorDateParts(new Date()).date;
  }

  getElSalvadorDateParts(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.scheduleTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);
    const value = (type: string) => parts.find((part) => part.type === type)?.value || '00';

    return {
      date: `${value('year')}-${value('month')}-${value('day')}`,
      hour: Number(value('hour')),
      minute: Number(value('minute'))
    };
  }

  addDaysToDate(date: string, days: number) {
    const [year, month, day] = date.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day + days));

    return [
      utcDate.getUTCFullYear(),
      String(utcDate.getUTCMonth() + 1).padStart(2, '0'),
      String(utcDate.getUTCDate()).padStart(2, '0')
    ].join('-');
  }

  isHourDisabled(hour: string) {
    if (!this.eventStartDate) {
      return false;
    }

    const coachId = this.currentUser?.role === 'coach' ? this.currentUser?._id : this.selectedCoachId;
    const studentId = this.currentUser?.role === 'alumno' ? this.currentUser?._id : this.selectedStudentId;

    if (!coachId && !studentId) {
      return false;
    }

    return this.events.some((event) => {
      const classEvent = event.extendedProps.classEvent;

      if (!classEvent || event.id === this.selectedEvent?.id) {
        return false;
      }

      const sameDate = this.formatDateForInput(event.start as string) === this.eventStartDate;
      const sameHour = this.formatTimeForInput(event.start as string) === hour;
      const sameCoach = Boolean(coachId && classEvent.coach?._id === coachId);
      const sameStudent = Boolean(studentId && classEvent.student?._id === studentId);

      return sameDate && sameHour && (sameCoach || sameStudent);
    });
  }

  roleLabel(role: UserRole) {
    const labels: Record<UserRole, string> = {
      administrador: 'Administrador',
      coach: 'Coach',
      alumno: 'Alumno'
    };

    return labels[role];
  }

  coachName(coach: AppUser) {
    return `${coach.firstName || ''} ${coach.lastName || ''}`.trim() || coach.username;
  }

  studentName(student: AppUser) {
    return `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username;
  }

  toFullCalendarEvent(event: CalendarClassEvent): CalendarEvent {
    const studentName = `${event.student.firstName || ''} ${event.student.lastName || ''}`.trim() || event.student.username;
    const coachName = `${event.coach.firstName || ''} ${event.coach.lastName || ''}`.trim() || event.coach.username;

    return {
      id: event._id,
      title: this.currentUser?.role === 'coach' ? `${event.title} - ${studentName}` : `${event.title} - ${coachName}`,
      start: event.start,
      end: event.end,
      extendedProps: {
        calendar: event.calendar,
        classEvent: event
      }
    };
  }
}
