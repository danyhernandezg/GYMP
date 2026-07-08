import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { AuthApiService } from '../../shared/services/auth-api.service';
import { ClassAvailabilitySlot, ClassOffering, ClassesApiService } from '../../shared/services/classes-api.service';
import { AppUser, UsersApiService } from '../../shared/services/users-api.service';

@Component({
  selector: 'app-classes',
  imports: [
    CommonModule,
    FormsModule,
    PageBreadcrumbComponent,
    BadgeComponent,
    ButtonComponent,
    ModalComponent
  ],
  templateUrl: './classes.component.html',
  styles: ``
})
export class ClassesComponent implements OnInit {
  classes: ClassOffering[] = [];
  coaches: AppUser[] = [];
  students: AppUser[] = [];
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 8;
  isLoading = true;
  isSaving = false;
  isDeleting = false;
  isEnrollmentSaving = false;
  isAvailabilityLoading = false;
  isFormOpen = false;
  isEnrollmentOpen = false;
  isRosterOpen = false;
  errorMessage = '';
  formErrorMessage = '';
  enrollmentErrorMessage = '';
  enrollmentMessage = '';
  classToDelete: ClassOffering | null = null;
  classToEnroll: ClassOffering | null = null;
  classRoster: ClassOffering | null = null;
  editingClass: ClassOffering | null = null;
  form = this.getEmptyForm();
  enrollmentForm = {
    date: '',
    time: '',
    studentId: ''
  };
  availabilitySlots: ClassAvailabilitySlot[] = [];
  private readonly scheduleTimeZone = 'America/El_Salvador';

  constructor(
    private readonly classesApi: ClassesApiService,
    private readonly usersApi: UsersApiService,
    private readonly auth: AuthApiService
  ) {}

  ngOnInit() {
    this.loadClasses();
    this.loadCoaches();
    this.loadStudents();
  }

  loadClasses() {
    this.isLoading = true;
    this.errorMessage = '';

    this.classesApi.listClasses().subscribe({
      next: (classes) => {
        this.classes = classes;
        this.currentPage = 1;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las clases.';
        this.isLoading = false;
      }
    });
  }

  loadCoaches() {
    if (!this.canManageClasses()) {
      return;
    }

    this.usersApi.listCoaches().subscribe({
      next: (coaches) => {
        this.coaches = coaches;
      }
    });
  }

  loadStudents() {
    if (!this.canManageClasses()) {
      return;
    }

    this.usersApi.listStudents().subscribe({
      next: (students) => {
        this.students = students;
      }
    });
  }

  get filteredClasses() {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.classes;
    }

    return this.classes.filter((classOffering) => {
      const haystack = [
        classOffering.name,
        classOffering.type,
        classOffering.description,
        this.getDisplayName(classOffering.coach),
        classOffering.status
      ].join(' ').toLowerCase();

      return haystack.includes(term);
    });
  }

  get totalPages() {
    return Math.max(Math.ceil(this.filteredClasses.length / this.itemsPerPage), 1);
  }

  get currentItems() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredClasses.slice(start, start + this.itemsPerPage);
  }

  onSearchChange() {
    this.currentPage = 1;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  openCreateModal() {
    this.editingClass = null;
    this.formErrorMessage = '';
    this.form = this.getEmptyForm();
    this.isFormOpen = true;
  }

  openEditModal(classOffering: ClassOffering) {
    this.editingClass = classOffering;
    this.formErrorMessage = '';
    this.form = {
      name: classOffering.name,
      type: classOffering.type,
      description: classOffering.description,
      coachId: classOffering.coach?._id || '',
      capacity: classOffering.capacity,
      status: classOffering.status
    };
    this.isFormOpen = true;
  }

  closeFormModal() {
    this.isFormOpen = false;
    this.editingClass = null;
    this.formErrorMessage = '';
  }

  saveClass() {
    if (this.isSaving) {
      return;
    }

    if (!this.form.name.trim() || !this.form.type.trim()) {
      this.formErrorMessage = 'Nombre y tipo son requeridos.';
      return;
    }

    if (!Number.isInteger(Number(this.form.capacity)) || Number(this.form.capacity) < 1) {
      this.formErrorMessage = 'Los cupos deben ser al menos 1.';
      return;
    }

    this.isSaving = true;
    this.formErrorMessage = '';

    const payload = {
      ...this.form,
      capacity: Number(this.form.capacity)
    };

    const request = this.editingClass
      ? this.classesApi.updateClass(this.editingClass._id, payload)
      : this.classesApi.createClass(payload);

    request.subscribe({
      next: (savedClass) => {
        if (this.editingClass) {
          this.classes = this.classes.map((classOffering) =>
            classOffering._id === savedClass._id ? savedClass : classOffering
          );
        } else {
          this.classes = [savedClass, ...this.classes];
        }

        this.isSaving = false;
        this.closeFormModal();
      },
      error: (error) => {
        this.formErrorMessage = error?.error?.message || 'No se pudo guardar la clase.';
        this.isSaving = false;
      }
    });
  }

  confirmDelete(classOffering: ClassOffering) {
    this.classToDelete = classOffering;
  }

  cancelDelete() {
    this.classToDelete = null;
  }

  deleteClass() {
    if (!this.classToDelete || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    const classId = this.classToDelete._id;

    this.classesApi.deleteClass(classId).subscribe({
      next: () => {
        this.classes = this.classes.filter((classOffering) => classOffering._id !== classId);
        this.classToDelete = null;
        this.isDeleting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo eliminar la clase.';
        this.classToDelete = null;
        this.isDeleting = false;
      }
    });
  }

  toggleEnrollment(classOffering: ClassOffering) {
    if (this.isEnrollmentSaving) {
      return;
    }

    if (!classOffering.isEnrolled) {
      this.openEnrollmentModal(classOffering);
      return;
    }

    this.isEnrollmentSaving = true;
    this.enrollmentMessage = '';

    this.classesApi.unenroll(classOffering._id).subscribe({
      next: (updatedClass) => {
        this.classes = this.classes.map((item) => item._id === updatedClass._id ? updatedClass : item);
        this.enrollmentMessage = 'Inscripcion cancelada correctamente.';
        this.isEnrollmentSaving = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo actualizar la inscripcion.';
        this.isEnrollmentSaving = false;
      }
    });
  }

  openEnrollmentModal(classOffering: ClassOffering) {
    this.classToEnroll = classOffering;
    this.enrollmentErrorMessage = '';
    this.enrollmentMessage = '';
    this.enrollmentForm = {
      date: this.getElSalvadorToday(),
      time: '',
      studentId: ''
    };
    this.isEnrollmentOpen = true;
    if (this.isStudent()) {
      this.loadAvailability();
    }
  }

  closeEnrollmentModal() {
    this.isEnrollmentOpen = false;
    this.classToEnroll = null;
    this.enrollmentErrorMessage = '';
    this.availabilitySlots = [];
  }

  openRosterModal(classOffering: ClassOffering) {
    this.classRoster = classOffering;
    this.isRosterOpen = true;
  }

  closeRosterModal() {
    this.isRosterOpen = false;
    this.classRoster = null;
  }

  openAdminEnrollmentModal(classOffering: ClassOffering) {
    this.classRoster = classOffering;
    this.classToEnroll = classOffering;
    this.enrollmentErrorMessage = '';
    this.enrollmentMessage = '';
    this.enrollmentForm = {
      date: this.getElSalvadorToday(),
      time: '',
      studentId: this.availableStudentsForClass(classOffering)[0]?._id || ''
    };
    this.isEnrollmentOpen = true;

    if (this.enrollmentForm.studentId) {
      this.loadAvailability();
    }
  }

  loadAvailability() {
    if (!this.classToEnroll || !this.enrollmentForm.date) {
      return;
    }

    this.isAvailabilityLoading = true;
    this.enrollmentErrorMessage = '';
    this.enrollmentForm.time = '';

    const studentId = this.canManageClasses() ? this.enrollmentForm.studentId : undefined;

    if (this.canManageClasses() && !studentId) {
      this.availabilitySlots = [];
      this.isAvailabilityLoading = false;
      return;
    }

    this.classesApi.getAvailability(this.classToEnroll._id, this.enrollmentForm.date, studentId).subscribe({
      next: (availability) => {
        this.availabilitySlots = availability.slots;
        const firstAvailableSlot = this.availabilitySlots.find((slot) => slot.available);
        this.enrollmentForm.time = firstAvailableSlot?.time || '';
        this.isAvailabilityLoading = false;
      },
      error: (error) => {
        this.enrollmentErrorMessage = error?.error?.message || 'No se pudieron cargar los horarios.';
        this.availabilitySlots = [];
        this.isAvailabilityLoading = false;
      }
    });
  }

  confirmEnrollment() {
    if (!this.classToEnroll || this.isEnrollmentSaving) {
      return;
    }

    if (!this.enrollmentForm.date || !this.enrollmentForm.time) {
      this.enrollmentErrorMessage = 'Selecciona fecha y hora para inscribirte.';
      return;
    }

    if (this.canManageClasses() && !this.enrollmentForm.studentId) {
      this.enrollmentErrorMessage = 'Selecciona un alumno.';
      return;
    }

    const selectedSlot = this.availabilitySlots.find((slot) => slot.time === this.enrollmentForm.time);
    if (!selectedSlot?.available) {
      this.enrollmentErrorMessage = 'Selecciona una hora disponible.';
      return;
    }

    this.isEnrollmentSaving = true;
    this.enrollmentErrorMessage = '';

    this.classesApi.enroll(this.classToEnroll._id, {
      start: this.buildEnrollmentStartDateTime(),
      studentId: this.canManageClasses() ? this.enrollmentForm.studentId : undefined
    }).subscribe({
      next: (updatedClass) => {
        this.updateClassInState(updatedClass);
        this.classRoster = this.classRoster?._id === updatedClass._id ? updatedClass : this.classRoster;
        this.enrollmentMessage = 'Inscripcion realizada correctamente y agregada al calendario.';
        this.isEnrollmentSaving = false;
        this.closeEnrollmentModal();
      },
      error: (error) => {
        this.enrollmentErrorMessage = error?.error?.message || 'No se pudo completar la inscripcion.';
        this.isEnrollmentSaving = false;
        this.loadAvailability();
      }
    });
  }

  removeStudentFromClass(classOffering: ClassOffering, student: AppUser) {
    if (this.isEnrollmentSaving) {
      return;
    }

    this.isEnrollmentSaving = true;
    this.enrollmentMessage = '';
    this.errorMessage = '';

    this.classesApi.unenroll(classOffering._id, student._id).subscribe({
      next: (updatedClass) => {
        this.updateClassInState(updatedClass);
        this.classRoster = this.classRoster?._id === updatedClass._id ? updatedClass : this.classRoster;
        this.enrollmentMessage = 'Alumno removido de la clase correctamente.';
        this.isEnrollmentSaving = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo remover el alumno.';
        this.isEnrollmentSaving = false;
      }
    });
  }

  availableStudentsForClass(classOffering: ClassOffering) {
    const enrolledIds = new Set((classOffering.enrolledStudents || []).map((student) => student._id));
    return this.students.filter((student) => !enrolledIds.has(student._id));
  }

  updateClassInState(updatedClass: ClassOffering) {
    this.classes = this.classes.map((item) => item._id === updatedClass._id ? updatedClass : item);
  }

  canManageClasses() {
    return this.auth.getUser()?.role === 'administrador';
  }

  isStudent() {
    return this.auth.getUser()?.role === 'alumno';
  }

  canEditClass(classOffering: ClassOffering) {
    return this.auth.getUser()?.role === 'administrador';
  }

  getDisplayName(user?: AppUser) {
    if (!user) {
      return 'Sin coach';
    }

    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.username || 'Sin coach';
  }

  getInitials(user?: AppUser) {
    return this.getDisplayName(user).slice(0, 2).toUpperCase();
  }

  getSpotsLabel(classOffering: ClassOffering) {
    return `${classOffering.enrolledCount}/${classOffering.capacity}`;
  }

  getAvailabilityLabel(classOffering: ClassOffering) {
    if (classOffering.status === 'archived') return 'Archivada';
    return classOffering.isFull ? 'Sin cupos' : `${classOffering.availableSpots} cupos`;
  }

  getAvailabilityBadgeColor(classOffering: ClassOffering): 'success' | 'warning' | 'error' | 'info' {
    if (classOffering.status === 'archived') return 'info';
    if (classOffering.isFull) return 'error';
    if (classOffering.availableSpots <= 2) return 'warning';
    return 'success';
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('es-SV', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(new Date(value));
  }

  minScheduleDate() {
    return this.getElSalvadorToday();
  }

  buildEnrollmentStartDateTime() {
    return `${this.enrollmentForm.date}T${this.enrollmentForm.time}:00-06:00`;
  }

  enrollmentEndLabel() {
    if (!this.enrollmentForm.date || !this.enrollmentForm.time) {
      return '';
    }

    const start = new Date(this.buildEnrollmentStartDateTime());
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return `${String(this.getElSalvadorDateParts(end).hour).padStart(2, '0')}:00`;
  }

  getSlotLabel(slot: ClassAvailabilitySlot) {
    const labels: Record<ClassAvailabilitySlot['reason'], string> = {
      past: 'Hora pasada',
      full: 'Sin cupos',
      student_busy: 'Ya tienes evento',
      coach_busy: 'Coach ocupado',
      '': ''
    };

    return `${slot.time}${slot.available ? '' : ' - ' + labels[slot.reason]}`;
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

  private getEmptyForm() {
    return {
      name: '',
      type: '',
      description: '',
      coachId: '',
      capacity: 10,
      status: 'active' as 'active' | 'archived'
    };
  }
}
