import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { CalendarClassEvent, CalendarEventsApiService } from '../../shared/services/calendar-events-api.service';
import { AppUser, UsersApiService } from '../../shared/services/users-api.service';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { AuthApiService } from '../../shared/services/auth-api.service';

@Component({
  selector: 'app-agenda',
  imports: [
    CommonModule,
    FormsModule,
    PageBreadcrumbComponent,
    BadgeComponent,
    ButtonComponent,
    ModalComponent
  ],
  templateUrl: './agenda.component.html',
  styles: ``
})
export class AgendaComponent implements OnInit {
  events: CalendarClassEvent[] = [];
  coaches: AppUser[] = [];
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 8;
  isLoading = true;
  isSaving = false;
  isDeleting = false;
  isEditOpen = false;
  errorMessage = '';
  formErrorMessage = '';
  eventToDelete: CalendarClassEvent | null = null;
  editingEvent: CalendarClassEvent | null = null;
  editForm = {
    startDate: '',
    startTime: '',
    coachId: ''
  };
  hourOptions = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
  private readonly scheduleTimeZone = 'America/El_Salvador';

  constructor(
    private readonly calendarEventsApi: CalendarEventsApiService,
    private readonly usersApi: UsersApiService,
    private readonly auth: AuthApiService
  ) {}

  ngOnInit() {
    this.loadAgenda();
    this.loadCoaches();
  }

  loadAgenda() {
    this.isLoading = true;
    this.errorMessage = '';

    this.calendarEventsApi.listEvents().subscribe({
      next: (events) => {
        this.events = events;
        this.currentPage = 1;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to load agenda.';
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

  get filteredEvents() {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.events;
    }

    return this.events.filter((event) => {
      const haystack = [
        event.title,
        this.getDisplayName(event.student),
        this.getDisplayName(event.coach),
        event.calendar,
        event.google?.studentSyncStatus,
        event.google?.coachSyncStatus
      ].join(' ').toLowerCase();

      return haystack.includes(term);
    });
  }

  get totalPages() {
    return Math.max(Math.ceil(this.filteredEvents.length / this.itemsPerPage), 1);
  }

  get currentItems() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredEvents.slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onSearchChange() {
    this.currentPage = 1;
  }

  openEditModal(event: CalendarClassEvent) {
    this.editingEvent = event;
    this.formErrorMessage = '';
    this.editForm = {
      startDate: this.formatDateForInput(event.start),
      startTime: this.formatTimeForInput(event.start),
      coachId: event.coach._id
    };
    this.isEditOpen = true;
  }

  closeEditModal() {
    this.isEditOpen = false;
    this.editingEvent = null;
    this.formErrorMessage = '';
  }

  saveEvent() {
    if (!this.editingEvent || this.isSaving) {
      return;
    }

    if (!this.editForm.startDate || !this.editForm.startTime || !this.editForm.coachId) {
      this.formErrorMessage = 'Fecha, hora y coach son requeridos.';
      return;
    }

    if (this.isPastHour(this.editForm.startTime) || this.isHourUnavailable(this.editForm.startTime)) {
      this.formErrorMessage = 'Selecciona una hora futura y disponible.';
      return;
    }

    this.isSaving = true;
    this.formErrorMessage = '';

    this.calendarEventsApi.updateEvent(this.editingEvent._id, {
      start: this.buildStartDateTime(),
      end: this.buildEndDateTime(),
      coachId: this.editForm.coachId
    }).subscribe({
      next: (updatedEvent) => {
        this.events = this.events.map((event) => event._id === updatedEvent._id ? updatedEvent : event);
        this.isSaving = false;
        this.closeEditModal();
      },
      error: (error) => {
        this.formErrorMessage = error?.error?.message || 'Unable to update event.';
        this.isSaving = false;
      }
    });
  }

  confirmDelete(event: CalendarClassEvent) {
    this.eventToDelete = event;
  }

  cancelDelete() {
    this.eventToDelete = null;
  }

  deleteEvent() {
    if (!this.eventToDelete || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    const eventId = this.eventToDelete._id;

    this.calendarEventsApi.deleteEvent(eventId).subscribe({
      next: () => {
        this.events = this.events.filter((event) => event._id !== eventId);
        this.eventToDelete = null;
        this.isDeleting = false;

        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to delete event.';
        this.eventToDelete = null;
        this.isDeleting = false;
      }
    });
  }

  getDisplayName(user: AppUser) {
    const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return name || user?.username || 'N/A';
  }

  getInitials(user: AppUser) {
    return this.getDisplayName(user).slice(0, 2).toUpperCase();
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('es-SV', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(new Date(value));
  }

  formatTime(value: string) {
    return new Intl.DateTimeFormat('es-SV', {
      timeZone: 'America/El_Salvador',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(value));
  }

  formatDateForInput(value: string | Date) {
    return this.getElSalvadorDateParts(new Date(value)).date;
  }

  formatTimeForInput(value: string | Date) {
    return `${String(this.getElSalvadorDateParts(new Date(value)).hour).padStart(2, '0')}:00`;
  }

  minScheduleDate() {
    return this.getElSalvadorToday();
  }

  visibleHourOptions() {
    return this.hourOptions.filter((hour) => !this.isPastHour(hour));
  }

  buildStartDateTime() {
    return `${this.editForm.startDate}T${this.editForm.startTime}:00-06:00`;
  }

  buildEndDateTime() {
    const start = new Date(this.buildStartDateTime());
    return new Date(start.getTime() + 60 * 60 * 1000).toISOString();
  }

  eventEndLabel() {
    if (!this.editForm.startDate || !this.editForm.startTime) {
      return '';
    }

    const end = new Date(new Date(this.buildStartDateTime()).getTime() + 60 * 60 * 1000);
    return `${String(this.getElSalvadorDateParts(end).hour).padStart(2, '0')}:00`;
  }

  isPastHour(hour: string) {
    if (!this.editForm.startDate || !hour) {
      return false;
    }

    const today = this.getElSalvadorToday();

    if (this.editForm.startDate < today) return true;
    if (this.editForm.startDate > today) return false;

    return Number(hour.slice(0, 2)) <= this.getElSalvadorDateParts(new Date()).hour;
  }

  isHourUnavailable(hour: string) {
    if (!this.editForm.startDate || !this.editForm.coachId) {
      return false;
    }

    return this.events.some((event) => {
      if (event._id === this.editingEvent?._id) {
        return false;
      }

      const sameCoach = event.coach?._id === this.editForm.coachId;
      const sameDate = this.formatDateForInput(event.start) === this.editForm.startDate;
      const sameHour = this.formatTimeForInput(event.start) === hour;

      return sameCoach && sameDate && sameHour;
    });
  }

  canChangeCoach() {
    return this.auth.getUser()?.role === 'administrador';
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

  getGoogleStatus(event: CalendarClassEvent) {
    const statuses = [event.google?.studentSyncStatus, event.google?.coachSyncStatus];

    if (statuses.every((status) => status === 'synced')) return 'Sincronizado';
    if (statuses.some((status) => status === 'synced')) return 'Parcial';
    if (statuses.some((status) => status === 'failed')) return 'Fallido';
    if (statuses.some((status) => status === 'pending')) return 'Pendiente';

    return 'Sin Google';
  }

  getGoogleBadgeColor(event: CalendarClassEvent): 'success' | 'warning' | 'error' | 'info' {
    const status = this.getGoogleStatus(event);

    if (status === 'Sincronizado') return 'success';
    if (status === 'Fallido') return 'error';
    if (status === 'Parcial') return 'info';
    if (status === 'Pendiente') return 'warning';

    return 'info';
  }
}
